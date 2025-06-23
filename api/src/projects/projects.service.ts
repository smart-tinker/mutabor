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

// РЕФАКТОРИНГ: Убраны дублирующиеся хелперы, так как они используются только в этом файле.
// Вместо них будет использоваться прямое преобразование.

@Injectable()
export class ProjectsService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async ensureUserHasAccessToProject(projectId: number, userId: string, trx?: Knex.Transaction) {
    const db = trx || this.knex;
    // Проверяем, является ли пользователь владельцем или участником проекта
    const project = await db('projects').where({ id: projectId }).first();
    if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    if (project.owner_id === userId) {
        return project; // Владелец имеет доступ
    }

    const membership = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (membership) {
        return project; // Участник имеет доступ
    }

    throw new ForbiddenException('You do not have permission to access or modify this project.');
  }

  async createProject(createProjectDto: CreateProjectDto, user: UserRecord): Promise<ProjectRecord> {
    return this.knex.transaction(async (trx) => {
      const [newProjectDb] = await trx('projects')
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
        id: crypto.randomUUID(), name, position: index, project_id: newProjectDb.id, created_at: new Date(), updatedAt: new Date(),
      }));

      const insertedDbColumns = await trx('columns').insert(defaultColumnsData).returning('*');
      
      const columns: ColumnRecord[] = insertedDbColumns.map(dbCol => ({
        ...dbCol,
        created_at: new Date(dbCol.created_at),
        updated_at: new Date(dbCol.updated_at),
      }));

      return {
         ...newProjectDb,
         created_at: new Date(newProjectDb.created_at),
         updated_at: new Date(newProjectDb.updated_at),
         columns,
      };
    });
  }

  async findAllProjectsForUser(user: UserRecord): Promise<ProjectRecord[]> {
    const projectsAsOwnerDb = await this.knex('projects').where({ owner_id: user.id });
    const projectsAsMemberDb = await this.knex('projects')
        .join('project_members', 'projects.id', '=', 'project_members.project_id')
        .where('project_members.user_id', user.id)
        .select('projects.*');
    
    const allDbProjects = [...projectsAsOwnerDb, ...projectsAsMemberDb];
    const uniqueDbProjects = Array.from(new Map(allDbProjects.map(p => [p.id, p])).values());

    return uniqueDbProjects
      .map(p => ({ ...p, created_at: new Date(p.created_at), updated_at: new Date(p.updated_at) }))
      .sort((a,b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async findProjectById(projectId: number, user: UserRecord): Promise<ProjectRecord> {
    const projectFromDb = await this.ensureUserHasAccessToProject(projectId, user.id);

    const columnsFromDb = await this.knex('columns').where({ project_id: projectId }).orderBy('position', 'asc');
    const tasksFromDb = await this.knex('tasks').whereIn('column_id', columnsFromDb.map(c => c.id)).orderBy('position', 'asc');
    
    const columns: ColumnRecord[] = columnsFromDb.map(dbCol => ({
      ...dbCol,
      created_at: new Date(dbCol.created_at),
      updated_at: new Date(dbCol.updated_at),
      tasks: tasksFromDb
        .filter(dbTask => dbTask.column_id === dbCol.id)
        .map(dbTask => ({
            ...dbTask,
            due_date: dbTask.due_date ? new Date(dbTask.due_date) : null,
            created_at: new Date(dbTask.created_at),
            updated_at: new Date(dbTask.updated_at)
        })),
    }));
    
    return {
        ...projectFromDb,
        created_at: new Date(projectFromDb.created_at),
        updated_at: new Date(projectFromDb.updated_at),
        columns,
    };
  }

  async addMemberToProject(projectId: number, addMemberDto: AddMemberDto, currentUserId: string): Promise<ProjectMemberRecord & { user: UserRecord }> {
    const project = await this.knex('projects').where({ id: projectId }).first();
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found.`);
    if (project.owner_id !== currentUserId) throw new ForbiddenException('Only project owners can add members.');

    const userToAddFromDb = await this.knex('users').select('*').where({ email: addMemberDto.email }).first();
    if (!userToAddFromDb) throw new NotFoundException(`User with email ${addMemberDto.email} not found.`);
    if (userToAddFromDb.id === currentUserId) throw new ConflictException('Cannot add the project owner as a member.');

    const existingMembership = await this.knex('project_members').where({ project_id: projectId, user_id: userToAddFromDb.id }).first();
    if (existingMembership) throw new ConflictException(`User ${addMemberDto.email} is already a member of this project.`);

    const newMemberData = { project_id: projectId, user_id: userToAddFromDb.id, role: addMemberDto.role, created_at: new Date(), updatedAt: new Date() };
    const [insertedMember] = await this.knex('project_members').insert(newMemberData).returning('*');
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userRecordFields } = userToAddFromDb;
    const userRecord: UserRecord = {
        ...userRecordFields,
        created_at: new Date(userRecordFields.created_at),
        updated_at: new Date(userRecordFields.updated_at),
    };

    return {
      project_id: insertedMember.project_id,
      user_id: insertedMember.user_id,
      role: insertedMember.role,
      created_at: new Date(insertedMember.created_at),
      updated_at: new Date(insertedMember.updated_at),
      user: userRecord,
    };
  }

  // РЕФАКТОРИНГ: Упрощен SQL-запрос. Используется `users.*` для получения всех полей пользователя,
  // что делает код короче и более устойчивым к добавлению новых полей в `UserRecord`.
  async getProjectMembers(projectId: number, currentUserId: string): Promise<Array<{ role: string; user: UserRecord }>> {
    await this.ensureUserHasAccessToProject(projectId, currentUserId);

    const membersFromDb = await this.knex('project_members')
      .join('users', 'project_members.user_id', '=', 'users.id')
      .where('project_members.project_id', projectId)
      .select('project_members.role', 'users.*') // Используем users.*
      .orderBy('users.name', 'asc');

    return membersFromDb.map(m => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, ...userFields } = m;
        return {
            role: m.role,
            user: {
                ...userFields,
                created_at: new Date(userFields.created_at),
                updated_at: new Date(userFields.updated_at),
            }
        };
    });
  }
}