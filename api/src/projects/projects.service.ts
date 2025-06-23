import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject, forwardRef, Logger } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import {
    ProjectRecord, UserRecord, ColumnRecord, TaskRecord, ProjectMemberRecord
} from '../types/db-records';
import { TasksService } from '../tasks/tasks.service'; // Предполагаем, что TasksService будет здесь

// Значения по умолчанию для настроек проекта, если они не заданы
const DEFAULT_PROJECT_STATUSES = ['To Do', 'In Progress', 'Done'];
const DEFAULT_PROJECT_TYPES = ['Task', 'Bug', 'Feature'];

// Определим тип для ответа методов get/updateProjectSettings, соответствующий ProjectSettingsResponse на клиенте
export interface ProjectSettingsDTO {
  id: number;
  name: string;
  prefix: string;
  settings_statuses: string[];
  settings_types: string[];
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    // Используем forwardRef для решения проблемы циклических зависимостей, если TasksService также зависит от ProjectsService
    @Inject(forwardRef(() => TasksService)) private readonly tasksService: TasksService,
  ) {}

  private parseProjectSettings(project: ProjectRecord): ProjectRecord {
    return {
      ...project,
      settings_statuses: project.settings_statuses ? JSON.parse(project.settings_statuses as string) : DEFAULT_PROJECT_STATUSES,
      settings_types: project.settings_types ? JSON.parse(project.settings_types as string) : DEFAULT_PROJECT_TYPES,
      // Убедимся, что даты также корректно обрабатываются, если они не были преобразованы ранее
      created_at: new Date(project.created_at),
      updated_at: new Date(project.updated_at),
    };
  }

  async ensureUserHasAccessToProject(projectId: number, userId: string, trx?: Knex.Transaction): Promise<ProjectRecord> {
    const db = trx || this.knex;
    // Проверяем, является ли пользователь владельцем или участником проекта
    const projectDb = await db('projects').where({ id: projectId }).first();
    if (!projectDb) {
        throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    if (projectDb.owner_id === userId) {
        return this.parseProjectSettings(projectDb); // Владелец имеет доступ
    }

    const membership = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (membership) {
        return this.parseProjectSettings(projectDb); // Участник имеет доступ
    }

    throw new ForbiddenException('You do not have permission to access or modify this project.');
  }

  async createProject(createProjectDto: CreateProjectDto, user: UserRecord): Promise<ProjectRecord> {
    return this.knex.transaction(async (trx) => {
      const [newProjectDb] = await trx('projects')
        .insert({
          name: createProjectDto.name,
          task_prefix: createProjectDto.prefix.toUpperCase(), // Ensure prefix is uppercase
          owner_id: user.id,
          last_task_number: 0,
          // settings_statuses and settings_types will use DB defaults if not provided
          settings_statuses: JSON.stringify(DEFAULT_PROJECT_STATUSES), // Set default statuses
          settings_types: JSON.stringify(DEFAULT_PROJECT_TYPES),       // Set default types
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      // Используем статусы из созданного проекта (или значения по умолчанию, если они null)
      const projectStatuses = newProjectDb.settings_statuses ? JSON.parse(newProjectDb.settings_statuses) : DEFAULT_PROJECT_STATUSES;

      const defaultColumnsData = projectStatuses.map((name: string, index: number) => ({
        id: crypto.randomUUID(), name, position: index, project_id: newProjectDb.id, created_at: new Date(), updatedAt: new Date(),
      }));

      const insertedDbColumns = await trx('columns').insert(defaultColumnsData).returning('*');
      
      const columns: ColumnRecord[] = insertedDbColumns.map(dbCol => ({
        ...dbCol,
        created_at: new Date(dbCol.created_at),
        updated_at: new Date(dbCol.updated_at),
      }));

      const finalProjectRecord = this.parseProjectSettings(newProjectDb);

      return {
         ...finalProjectRecord,
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
      .map(p => this.parseProjectSettings(p)) // Используем parseProjectSettings
      .sort((a,b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async findProjectById(projectId: number, user: UserRecord): Promise<ProjectRecord> {
    // ensureUserHasAccessToProject уже возвращает распарсенный проект
    const projectWithSettings = await this.ensureUserHasAccessToProject(projectId, user.id);

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
        ...projectWithSettings, // Уже содержит распарсенные settings_statuses и settings_types
        columns,
    };
  }

  async getProjectSettings(projectId: number, userId: string): Promise<ProjectSettingsDTO> {
    const project = await this.ensureUserHasAccessToProject(projectId, userId);
    // Возвращаем только нужные поля для настроек, маппим task_prefix -> prefix
    return {
      id: project.id,
      name: project.name,
      prefix: project.task_prefix, // Маппинг
      settings_statuses: project.settings_statuses as unknown as string[], // ensureUserHasAccessToProject уже распарсил
      settings_types: project.settings_types as unknown as string[],   // ensureUserHasAccessToProject уже распарсил
    };
  }

  async updateProjectSettings(
    projectId: number,
    userId: string,
    settingsDto: UpdateProjectSettingsDto,
  ): Promise<ProjectSettingsDTO> {
    return this.knex.transaction(async (trx) => {
      const project = await this.ensureUserHasAccessToProject(projectId, userId, trx); // project содержит распарсенные settings_statuses/types и task_prefix

      if (project.owner_id !== userId) {
        throw new ForbiddenException('Only the project owner can change project settings.');
      }

      const currentPrefix = project.task_prefix;
      const updatePayload: Partial<ProjectRecord> = { updated_at: new Date() };

      if (settingsDto.name) {
        updatePayload.name = settingsDto.name;
      }
      if (settingsDto.prefix) {
        const newPrefix = settingsDto.prefix.toUpperCase();
        // Проверка на уникальность префикса, если он меняется
        if (newPrefix !== currentPrefix) {
            const existingProjectWithPrefix = await trx('projects').where({ task_prefix: newPrefix }).whereNot({ id: projectId }).first();
            if (existingProjectWithPrefix) {
                throw new ConflictException(`Project prefix '${newPrefix}' is already in use.`);
            }
            updatePayload.task_prefix = newPrefix;
        }
      }
      if (settingsDto.statuses) {
        updatePayload.settings_statuses = JSON.stringify(settingsDto.statuses);
      }
      if (settingsDto.types) {
        updatePayload.settings_types = JSON.stringify(settingsDto.types);
      }

      if (Object.keys(updatePayload).length === 1 && updatePayload.updated_at) {
        // Ничего не было изменено кроме updated_at
        return this.getProjectSettings(projectId, userId); // Возвращаем текущие настройки
      }

      await trx('projects').where({ id: projectId }).update(updatePayload);

      // Если префикс был изменен, обновить префиксы задач
      if (updatePayload.task_prefix && updatePayload.task_prefix !== currentPrefix) {
        const numUpdatedTasks = await this.tasksService.updateTaskPrefixesForProject(projectId, currentPrefix, updatePayload.task_prefix, trx);
        this.logger.log(`Task prefixes update for project ${projectId} (from ${currentPrefix} to ${updatePayload.task_prefix}) affected ${numUpdatedTasks} tasks.`);
      }

      // Возвращаем обновленные настройки
      const updatedProjectRaw = await trx('projects').where({ id: projectId }).first();
      if (!updatedProjectRaw) throw new NotFoundException('Project disappeared after update.'); // Should not happen

      const parsedUpdatedProject = this.parseProjectSettings(updatedProjectRaw); // Это все еще ProjectRecord
      return {
        id: parsedUpdatedProject.id,
        name: parsedUpdatedProject.name,
        prefix: parsedUpdatedProject.task_prefix, // Маппинг
        settings_statuses: parsedUpdatedProject.settings_statuses as unknown as string[],
        settings_types: parsedUpdatedProject.settings_types as unknown as string[],
      };
    });
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