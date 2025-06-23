import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject, forwardRef, Logger } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import {
    ProjectRecord, UserRecord, ColumnRecord, TaskRecord, ProjectMemberRecord, ParsedProjectRecord
} from '../types/db-records';
import { TasksService } from '../tasks/tasks.service';

const DEFAULT_PROJECT_STATUSES = ['To Do', 'In Progress', 'Done'];
const DEFAULT_PROJECT_TYPES = ['Task', 'Bug', 'Feature'];

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
    @Inject(forwardRef(() => TasksService)) private readonly tasksService: TasksService,
  ) {}

  private parseProjectSettings(project: ProjectRecord): ParsedProjectRecord {
    let statuses: string[] = DEFAULT_PROJECT_STATUSES;
    let types: string[] = DEFAULT_PROJECT_TYPES;

    try {
        if (project.settings_statuses && typeof project.settings_statuses === 'string' && project.settings_statuses.trim() !== '') {
            statuses = JSON.parse(project.settings_statuses);
        } else if (Array.isArray(project.settings_statuses)) {
            statuses = project.settings_statuses;
        }
    } catch (e) {
        this.logger.error(`Failed to parse settings_statuses for project ${project.id}`, e);
        statuses = DEFAULT_PROJECT_STATUSES;
    }

    try {
        if (project.settings_types && typeof project.settings_types === 'string' && project.settings_types.trim() !== '') {
            types = JSON.parse(project.settings_types);
        } else if (Array.isArray(project.settings_types)) {
            types = project.settings_types;
        }
    } catch (e) {
        this.logger.error(`Failed to parse settings_types for project ${project.id}`, e);
        types = DEFAULT_PROJECT_TYPES;
    }

    return {
      ...project,
      settings_statuses: statuses,
      settings_types: types,
      created_at: new Date(project.created_at),
      updated_at: new Date(project.updated_at),
    };
  }

  async ensureUserHasAccessToProject(projectId: number, userId: string, trx?: Knex.Transaction): Promise<ParsedProjectRecord> {
    const db = trx || this.knex;
    const projectDb = await db('projects').where({ id: projectId }).first();
    if (!projectDb) {
        throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    if (projectDb.owner_id === userId) {
        return this.parseProjectSettings(projectDb);
    }

    const membership = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (membership) {
        return this.parseProjectSettings(projectDb);
    }

    throw new ForbiddenException('You do not have permission to access or modify this project.');
  }

  async createProject(createProjectDto: CreateProjectDto, user: UserRecord): Promise<ParsedProjectRecord> {
    return this.knex.transaction(async (trx) => {
      const [newProjectDb] = await trx('projects')
        .insert({
          name: createProjectDto.name,
          task_prefix: createProjectDto.prefix.toUpperCase(),
          owner_id: user.id,
          last_task_number: 0,
          settings_statuses: JSON.stringify(DEFAULT_PROJECT_STATUSES),
          settings_types: JSON.stringify(DEFAULT_PROJECT_TYPES),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      const projectStatuses = DEFAULT_PROJECT_STATUSES;

      const defaultColumnsData = projectStatuses.map((name: string, index: number) => ({
        id: crypto.randomUUID(), name, position: index, project_id: newProjectDb.id, created_at: new Date(), updated_at: new Date(),
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

  async findAllProjectsForUser(user: UserRecord): Promise<ParsedProjectRecord[]> {
    const projectsAsOwnerDb = await this.knex('projects').where({ owner_id: user.id }).orderBy('created_at', 'desc');
    const projectsAsMemberDb = await this.knex('projects')
        .join('project_members', 'projects.id', '=', 'project_members.project_id')
        .where('project_members.user_id', user.id)
        .select('projects.*')
        .orderBy('projects.created_at', 'desc');
    
    const allDbProjects = [...projectsAsOwnerDb, ...projectsAsMemberDb];
    const uniqueDbProjects = Array.from(new Map(allDbProjects.map(p => [p.id, p])).values());

    return uniqueDbProjects
      .map(p => this.parseProjectSettings(p))
      .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async findProjectById(projectId: number, user: UserRecord): Promise<ParsedProjectRecord> {
    const projectWithSettings = await this.ensureUserHasAccessToProject(projectId, user.id);

    const columnsFromDb = await this.knex('columns').where({ project_id: projectId }).orderBy('position', 'asc');
    const tasksFromDb = columnsFromDb.length > 0
        ? await this.knex('tasks').whereIn('column_id', columnsFromDb.map(c => c.id)).orderBy('position', 'asc')
        : [];
    
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
        ...projectWithSettings,
        columns,
    };
  }

  async getProjectSettings(projectId: number, userId: string): Promise<ProjectSettingsDTO> {
    const project = await this.ensureUserHasAccessToProject(projectId, userId);
    return {
      id: project.id,
      name: project.name,
      prefix: project.task_prefix,
      settings_statuses: project.settings_statuses,
      settings_types: project.settings_types,
    };
  }

  async updateProjectSettings(
    projectId: number,
    userId: string,
    settingsDto: UpdateProjectSettingsDto,
  ): Promise<ProjectSettingsDTO> {
    return this.knex.transaction(async (trx) => {
      const project = await this.ensureUserHasAccessToProject(projectId, userId, trx);

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
        return this.getProjectSettings(projectId, userId);
      }

      await trx('projects').where({ id: projectId }).update(updatePayload);

      if (updatePayload.task_prefix && updatePayload.task_prefix !== currentPrefix) {
        const numUpdatedTasks = await this.tasksService.updateTaskPrefixesForProject(projectId, currentPrefix, updatePayload.task_prefix, trx);
        this.logger.log(`Task prefixes update for project ${projectId} (from ${currentPrefix} to ${updatePayload.task_prefix}) affected ${numUpdatedTasks} tasks.`);
      }

      const updatedProjectRaw = await trx('projects').where({ id: projectId }).first();
      if (!updatedProjectRaw) throw new NotFoundException('Project disappeared after update.');

      const parsedUpdatedProject = this.parseProjectSettings(updatedProjectRaw);
      return {
        id: parsedUpdatedProject.id,
        name: parsedUpdatedProject.name,
        prefix: parsedUpdatedProject.task_prefix,
        settings_statuses: parsedUpdatedProject.settings_statuses,
        settings_types: parsedUpdatedProject.settings_types,
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

    const newMemberData = { project_id: projectId, user_id: userToAddFromDb.id, role: addMemberDto.role, created_at: new Date(), updated_at: new Date() };
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

  async getProjectMembers(projectId: number, currentUserId: string): Promise<Array<{ role: string; user: UserRecord }>> {
    await this.ensureUserHasAccessToProject(projectId, currentUserId);

    const membersFromDb = await this.knex('project_members')
      .join('users', 'project_members.user_id', '=', 'users.id')
      .where('project_members.project_id', projectId)
      .select('project_members.role', 'users.*')
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