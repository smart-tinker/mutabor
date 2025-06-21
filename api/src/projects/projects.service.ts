import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined
import * as crypto from 'crypto';
import {
    ProjectRecord, UserRecord, ColumnRecord, TaskRecord, ProjectMemberRecord
} from '../types/db-records';

const DEFAULT_COLUMN_NAMES = ['To Do', 'In Progress', 'Done'];

// Helper to convert DB record to ProjectRecord (handles date conversion)
function toProjectRecord(dbProject: any): ProjectRecord {
    return {
        ...dbProject,
        created_at: new Date(dbProject.created_at),
        updated_at: new Date(dbProject.updated_at),
    };
}

// Helper to convert DB record to ColumnRecord
function toColumnRecord(dbColumn: any): ColumnRecord {
    return {
        ...dbColumn,
        created_at: new Date(dbColumn.created_at),
        updated_at: new Date(dbColumn.updated_at),
    };
}

// Helper to convert DB record to TaskRecord
function toTaskRecord(dbTask: any): TaskRecord {
    return {
        ...dbTask,
        due_date: dbTask.due_date ? new Date(dbTask.due_date) : null,
        created_at: new Date(dbTask.created_at),
        updated_at: new Date(dbTask.updated_at),
    };
}

// Helper to convert DB record to UserRecord
function toUserRecord(dbUser: any): UserRecord {
    if (!dbUser) return null; // Handle cases where user might be null (e.g. assignee)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userProps } = dbUser; // Exclude password_hash
    return {
        ...userProps,
        created_at: new Date(userProps.created_at),
        updated_at: new Date(userProps.updated_at),
    };
}


@Injectable()
export class ProjectsService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async createProject(createProjectDto: CreateProjectDto, user: UserRecord): Promise<ProjectRecord> {
    return this.knex.transaction(async (trx) => {
      const [newProject] = await trx('projects')
        .insert({
          name: createProjectDto.name,
          task_prefix: createProjectDto.prefix, // Assuming column name task_prefix
          owner_id: user.id, // Assuming column name owner_id
          last_task_number: 0,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      const defaultColumnsData = DEFAULT_COLUMN_NAMES.map((name, index) => ({
        id: crypto.randomUUID(),
        name,
        position: index, // Use index for position
        project_id: newProject.id,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const insertedDbColumns = await trx('columns').insert(defaultColumnsData).returning('*');
      const columns: ColumnRecord[] = insertedDbColumns.map(toColumnRecord);

      return { ...toProjectRecord(newProject), columns };
    });
  }

  async findAllProjectsForUser(user: UserRecord): Promise<ProjectRecord[]> {
    const projectsAsOwnerDb = await this.knex('projects')
      .where({ owner_id: user.id })
      .orderBy('created_at', 'desc');

    const projectsAsMemberDb = await this.knex('projects')
      .join('project_members', 'projects.id', '=', 'project_members.project_id')
      .where('project_members.user_id', user.id)
      .select('projects.*')
      .orderBy('projects.created_at', 'desc');

    const allDbProjects = [...projectsAsOwnerDb, ...projectsAsMemberDb];
    const uniqueDbProjects = Array.from(new Set(allDbProjects.map(p => p.id)))
      .map(id => allDbProjects.find(p => p.id === id));

    return uniqueDbProjects.map(toProjectRecord);
  }

  async findProjectById(projectId: number, user: UserRecord): Promise<ProjectRecord> {
    const projectFromDb = await this.knex('projects').where({ id: projectId }).first();

    if (!projectFromDb) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    const isOwner = projectFromDb.owner_id === user.id;
    let isMember = false;
    if (!isOwner) {
      const member = await this.knex('project_members')
        .where({ project_id: projectId, user_id: user.id })
        .first();
      isMember = !!member;
    }

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have permission to access this project.');
    }

    const columnsFromDb = await this.knex('columns')
      .where({ project_id: projectId })
      .orderBy('position', 'asc');

    const tasksFromDb = await this.knex('tasks')
      .whereIn('column_id', columnsFromDb.map(c => c.id))
      .orderBy('position', 'asc');

    const columns: ColumnRecord[] = columnsFromDb.map(dbCol => ({
      ...toColumnRecord(dbCol),
      tasks: tasksFromDb.filter(dbTask => dbTask.column_id === dbCol.id).map(toTaskRecord),
    }));

    return { ...toProjectRecord(projectFromDb), columns };
  }

  async addMemberToProject(projectId: number, addMemberDto: AddMemberDto, currentUserId: string): Promise<ProjectMemberRecord & { user: UserRecord }> {
    const project = await this.knex('projects').where({ id: projectId }).first();

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    if (project.owner_id !== currentUserId) {
      throw new ForbiddenException('Only project owners can add members.');
    }

    const userToAddFromDb = await this.knex('users')
      .select('id', 'name', 'email', 'created_at', 'updated_at') // Select all fields for UserRecord
      .where({ email: addMemberDto.email })
      .first();

    if (!userToAddFromDb) {
      throw new NotFoundException(`User with email ${addMemberDto.email} not found.`);
    }

    if (userToAddFromDb.id === currentUserId) {
      throw new ConflictException('Cannot add the project owner as a member.');
    }

    const existingMembership = await this.knex('project_members')
      .where({ project_id: projectId, user_id: userToAddFromDb.id })
      .first();

    if (existingMembership) {
      throw new ConflictException(`User ${addMemberDto.email} is already a member of this project.`);
    }

    const newMemberData = {
        project_id: projectId,
        user_id: userToAddFromDb.id,
        role: addMemberDto.role,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const [insertedMember] = await this.knex('project_members')
      .insert(newMemberData)
      .returning('*');

    const userRecord = toUserRecord(userToAddFromDb);

    return {
      project_id: insertedMember.project_id,
      user_id: insertedMember.user_id,
      role: insertedMember.role,
      created_at: new Date(insertedMember.created_at),
      updated_at: new Date(insertedMember.updated_at),
      user: userRecord,
    };
  }

  async getProjectMembers(projectId: number, currentUserId: string): Promise<Array<{ role: string; user: UserRecord }>> {
    const project = await this.knex('projects').where({ id: projectId }).first();
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }
    const isOwner = project.owner_id === currentUserId;
    let isMember = false;
    if(!isOwner) {
        const membership = await this.knex('project_members')
            .where({project_id: projectId, user_id: currentUserId})
            .first();
        isMember = !!membership;
    }
    if(!isOwner && !isMember) {
        throw new ForbiddenException('You do not have permission to view members of this project.');
    }

    const membersFromDb = await this.knex('project_members')
      .join('users', 'project_members.user_id', '=', 'users.id')
      .where('project_members.project_id', projectId)
      .select(
        'project_members.role',
        'users.id as userId',
        'users.email',
        'users.name',
        'users.created_at as user_created_at', // Select for UserRecord
        'users.updated_at as user_updated_at'  // Select for UserRecord
      )
      .orderBy('users.name', 'asc');

    return membersFromDb.map(m => ({
        role: m.role,
        user: { // Construct UserRecord
            id: m.userId,
            email: m.email,
            name: m.name,
            created_at: new Date(m.user_created_at),
            updated_at: new Date(m.user_updated_at),
        }
    }));
  }
}
