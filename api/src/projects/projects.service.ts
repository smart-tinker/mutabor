import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import {
    ProjectRecord, UserRecord, ColumnRecord, TaskRecord, ProjectMemberRecord
} from '../types/db-records';

const DEFAULT_COLUMN_NAMES = ['To Do', 'In Progress', 'Done'];

function toProjectRecord(dbProject: any): ProjectRecord {
    return { ...dbProject, created_at: new Date(dbProject.created_at), updated_at: new Date(dbProject.updated_at) };
}
function toColumnRecord(dbColumn: any): ColumnRecord {
    return { ...dbColumn, created_at: new Date(dbColumn.created_at), updatedAt: new Date(dbColumn.updated_at) };
}
function toTaskRecord(dbTask: any): TaskRecord {
    if (!dbTask) return null;
    return { ...dbTask, due_date: dbTask.due_date ? new Date(dbTask.due_date) : null, created_at: new Date(dbTask.created_at), updatedAt: new Date(dbTask.updated_at) };
}
function toUserRecord(dbUser: any): UserRecord {
    if (!dbUser) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userProps } = dbUser;
    return { ...userProps, created_at: new Date(userProps.created_at), updated_at: new Date(userProps.updated_at) };
}

@Injectable()
export class ProjectsService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async ensureUserHasAccessToProject(projectId: number, userId: string, trx?: Knex.Transaction) {
    const db = trx || this.knex;
    const projectAccess = await db('projects')
        .leftJoin('project_members', 'projects.id', 'project_members.project_id')
        .where('projects.id', projectId)
        .andWhere(function() {
            this.where('projects.owner_id', userId)
                .orWhere('project_members.user_id', userId);
        })
        .first();

    if (!projectAccess) {
      throw new ForbiddenException('You do not have permission to access or modify this project.');
    }
    return projectAccess;
  }

  async createProject(createProjectDto: CreateProjectDto, user: UserRecord): Promise<ProjectRecord> {
    return this.knex.transaction(async (trx) => {
      const [newProject] = await trx('projects')
        .insert({
          name: createProjectDto.name,
          task_prefix: createProjectDto.prefix,
          owner_id: user.id,
          last_task_number: 0,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      const defaultColumnsData = DEFAULT_COLUMN_NAMES.map((name, index) => ({
        id: crypto.randomUUID(), name, position: index, project_id: newProject.id, created_at: new Date(), updatedAt: new Date(),
      }));

      const insertedDbColumns = await trx('columns').insert(defaultColumnsData).returning('*');
      const columns: ColumnRecord[] = insertedDbColumns.map(toColumnRecord);

      return { ...toProjectRecord(newProject), columns };
    });
  }

  async findAllProjectsForUser(user: UserRecord): Promise<ProjectRecord[]> {
    const projectsAsOwnerDb = await this.knex('projects').where({ owner_id: user.id }).orderBy('created_at', 'desc');
    const projectsAsMemberDb = await this.knex('projects').join('project_members', 'projects.id', '=', 'project_members.project_id').where('project_members.user_id', user.id).select('projects.*').orderBy('projects.created_at', 'desc');
    const allDbProjects = [...projectsAsOwnerDb, ...projectsAsMemberDb];
    const uniqueDbProjects = Array.from(new Set(allDbProjects.map(p => p.id))).map(id => allDbProjects.find(p => p.id === id));
    return uniqueDbProjects.map(toProjectRecord);
  }

  async findProjectById(projectId: number, user: UserRecord): Promise<ProjectRecord> {
    const projectFromDb = await this.knex('projects').where({ id: projectId }).first();
    if (!projectFromDb) throw new NotFoundException(`Project with ID ${projectId} not found.`);

    await this.ensureUserHasAccessToProject(projectId, user.id);

    const columnsFromDb = await this.knex('columns').where({ project_id: projectId }).orderBy('position', 'asc');
    const tasksFromDb = await this.knex('tasks').whereIn('column_id', columnsFromDb.map(c => c.id)).orderBy('position', 'asc');
    const columns: ColumnRecord[] = columnsFromDb.map(dbCol => ({
      ...toColumnRecord(dbCol),
      tasks: tasksFromDb.filter(dbTask => dbTask.column_id === dbCol.id).map(toTaskRecord),
    }));
    return { ...toProjectRecord(projectFromDb), columns };
  }

  async addMemberToProject(projectId: number, addMemberDto: AddMemberDto, currentUserId: string): Promise<ProjectMemberRecord & { user: UserRecord }> {
    const project = await this.knex('projects').where({ id: projectId }).first();
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found.`);
    if (project.owner_id !== currentUserId) throw new ForbiddenException('Only project owners can add members.');

    const userToAddFromDb = await this.knex('users').select('id', 'name', 'email', 'created_at', 'updated_at').where({ email: addMemberDto.email }).first();
    if (!userToAddFromDb) throw new NotFoundException(`User with email ${addMemberDto.email} not found.`);
    if (userToAddFromDb.id === currentUserId) throw new ConflictException('Cannot add the project owner as a member.');

    const existingMembership = await this.knex('project_members').where({ project_id: projectId, user_id: userToAddFromDb.id }).first();
    if (existingMembership) throw new ConflictException(`User ${addMemberDto.email} is already a member of this project.`);

    const newMemberData = { project_id: projectId, user_id: userToAddFromDb.id, role: addMemberDto.role, created_at: new Date(), updatedAt: new Date() };
    const [insertedMember] = await this.knex('project_members').insert(newMemberData).returning('*');
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
    await this.ensureUserHasAccessToProject(projectId, currentUserId);

    const membersFromDb = await this.knex('project_members')
      .join('users', 'project_members.user_id', '=', 'users.id')
      .where('project_members.project_id', projectId)
      .select(
        'project_members.role',
        'users.id', // Directly select the fields
        'users.email',
        'users.name',
        'users.created_at',
        'users.updated_at'
      )
      .orderBy('users.name', 'asc');

    // **ИСПРАВЛЕНИЕ ЗДЕСЬ:** Используем хелпер toUserRecord для каждого элемента
    return membersFromDb.map(m => ({
        role: m.role,
        user: toUserRecord(m) // Передаем весь объект 'm' в хелпер
    }));
  }
}