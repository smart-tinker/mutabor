// api/src/projects/projects.service.ts
import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject, forwardRef, Logger, BadRequestException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import { ProjectRecord, UserRecord, ProjectMemberWithUser, ColumnRecord, TaskRecord } from '../types/db-records';
import { ProjectDetailsDto } from './dto/project-details.dto';
import { TasksService } from '../tasks/tasks.service';
import { Role } from '../casl/roles.enum';

const DEFAULT_PROJECT_COLUMNS = ['To Do', 'In Progress', 'Done'];
const DEFAULT_PROJECT_TYPES = ['Task', 'Bug', 'Feature'];

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    @Inject(forwardRef(() => TasksService)) private readonly tasksService: TasksService,
  ) {}

  async getProjectAndRole(projectId: number, userId: string, trx?: Knex.Transaction): Promise<{ project: ProjectRecord; userRole: Role }> {
    const db = trx || this.knex;
    const project = await db('projects').where({ id: projectId }).first();
    if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    if (project.owner_id === userId) {
        return { project, userRole: Role.Owner };
    }

    const membership = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (membership) {
        const role = Object.values(Role).includes(membership.role as Role) ? membership.role as Role : Role.Viewer;
        return { project, userRole: role };
    }

    throw new ForbiddenException('You do not have permission to access this project.');
  }
  
  async getProjectOwner(projectId: number): Promise<UserRecord> {
    const project = await this.knex('projects').where({ id: projectId }).select('owner_id').first();
    if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }
    const owner = await this.knex('users').where({ id: project.owner_id }).select('id', 'name', 'email', 'created_at', 'updated_at').first();
    if (!owner) {
        throw new NotFoundException(`Owner for project ID ${projectId} not found.`);
    }
    return owner;
  }

  async createProject(createProjectDto: CreateProjectDto, user: UserRecord): Promise<ProjectRecord> {
    return this.knex.transaction(async (trx) => {
      const [newProject] = await trx('projects')
        .insert({
          name: createProjectDto.name,
          task_prefix: createProjectDto.prefix.toUpperCase(),
          owner_id: user.id,
        })
        .returning('*');

      const defaultColumns = DEFAULT_PROJECT_COLUMNS.map((name, index) => ({
        id: crypto.randomUUID(), name, position: index, project_id: newProject.id,
      }));
      await trx('columns').insert(defaultColumns);

      const defaultTypes = DEFAULT_PROJECT_TYPES.map(name => ({
        name, project_id: newProject.id,
      }));
      await trx('project_task_types').insert(defaultTypes);
      
      return newProject;
    });
  }

  async findAllProjectsForUser(userId: string): Promise<ProjectRecord[]> {
    const projectsAsOwner = await this.knex('projects').where({ owner_id: userId });
    const projectsAsMember = await this.knex('projects')
        .join('project_members', 'projects.id', '=', 'project_members.project_id')
        .where('project_members.user_id', userId)
        .select('projects.*');
    
    const allProjects = [...projectsAsOwner, ...projectsAsMember];
    const uniqueProjects = Array.from(new Map(allProjects.map(p => [p.id, p])).values());

    return uniqueProjects.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getProjectDetails(projectId: number): Promise<ProjectDetailsDto> {
    const project = await this.knex('projects').where({ id: projectId }).first();
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    const [columnsDb, tasksDb, taskTypesDb, owner, membersResult] = await Promise.all([
      this.knex('columns').where({ project_id: projectId }).orderBy('position', 'asc'),
      this.knex('tasks').where({ project_id: projectId }).orderBy('position', 'asc'),
      this.knex('project_task_types').where({ project_id: projectId }).orderBy('id', 'asc'),
      this.getProjectOwner(projectId),
      this.getProjectMembers(projectId)
    ]);
    
    // ### ИСПРАВЛЕНИЕ: Мапим данные из структуры ProjectMemberWithUser в плоскую структуру ProjectMemberDto
    const members = membersResult.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }));

    const columns = columnsDb.map(col => ({
      ...col, // id, name, position
      tasks: tasksDb
        .filter(task => task.column_id === col.id)
        .map(task => ({ ...task })), // Возвращаем полный объект TaskDto
    }));

    return {
      id: project.id,
      name: project.name,
      prefix: project.task_prefix,
      owner,
      members,
      columns,
      availableTaskTypes: taskTypesDb.map(t => t.name),
    };
  }

  async updateProjectSettings(
    projectId: number,
    settingsDto: UpdateProjectSettingsDto,
  ): Promise<void> {
    return this.knex.transaction(async (trx) => {
      const project = await trx('projects').where({id: projectId}).first();
      if (!project) throw new NotFoundException(`Project with ID ${projectId} not found.`);

      const updatePayload: Partial<Pick<ProjectRecord, 'name' | 'task_prefix'>> = {};
      if (settingsDto.name) updatePayload.name = settingsDto.name;
      if (settingsDto.prefix) {
        const newPrefix = settingsDto.prefix.toUpperCase();
        if (newPrefix !== project.task_prefix) {
            const existing = await trx('projects').where({ task_prefix: newPrefix }).whereNot({ id: projectId }).first();
            if (existing) throw new ConflictException(`Project prefix '${newPrefix}' is already in use.`);
            updatePayload.task_prefix = newPrefix;
            await this.tasksService.updateTaskPrefixesForProject(projectId, project.task_prefix, newPrefix, trx);
        }
      }
      if (Object.keys(updatePayload).length > 0) {
        await trx('projects').where({ id: projectId }).update(updatePayload);
      }
      
      if (settingsDto.types) {
        await trx('project_task_types').where({ project_id: projectId }).delete();
        if (settingsDto.types.length > 0) {
          const newTypesData = settingsDto.types.map(name => ({ name, project_id: projectId }));
          await trx('project_task_types').insert(newTypesData);
        }
      }
    });
  }

  async createColumn(projectId: number, createColumnDto: CreateColumnDto): Promise<ColumnRecord> {
    const { name } = createColumnDto;
    const maxPositionResult = await this.knex('columns')
        .where({ project_id: projectId })
        .max('position as max_pos')
        .first();

    const newPosition = (maxPositionResult?.max_pos ?? -1) + 1;

    const [newColumn] = await this.knex('columns')
      .insert({
        id: crypto.randomUUID(),
        name,
        project_id: projectId,
        position: newPosition,
      })
      .returning('*');

    return newColumn;
  }

  async updateColumn(projectId: number, columnId: string, updateColumnDto: UpdateColumnDto): Promise<ColumnRecord> {
    const column = await this.knex('columns').where({ id: columnId, project_id: projectId }).first();
    if (!column) throw new NotFoundException(`Column with ID ${columnId} not found in this project.`);

    const [updatedColumn] = await this.knex('columns')
      .where({ id: columnId })
      .update({ name: updateColumnDto.name, updated_at: new Date() })
      .returning('*');
    
    return updatedColumn;
  }

  async deleteColumn(projectId: number, columnId: string): Promise<void> {
    return this.knex.transaction(async (trx) => {
      const allColumns = await trx('columns').where({ project_id: projectId }).orderBy('position', 'asc');
      if (allColumns.length <= 2) {
        throw new BadRequestException('Cannot delete column. A project must have at least two columns.');
      }
      const columnToDelete = allColumns.find(c => c.id === columnId);
      if (!columnToDelete) return;

      const columnIndex = allColumns.findIndex(c => c.id === columnId);
      const targetColumn = (columnIndex > 0) ? allColumns[columnIndex - 1] : allColumns[1];

      const tasksToMove = await trx('tasks').where({ column_id: columnId });
      if (tasksToMove.length > 0) {
        const maxPosInTargetResult = await trx('tasks').where({ column_id: targetColumn.id }).max('position as max_pos').first();
        let currentPos = (maxPosInTargetResult?.max_pos ?? -1) + 1;
        for (const task of tasksToMove) {
          await trx('tasks').where({ id: task.id }).update({ column_id: targetColumn.id, position: currentPos++ });
        }
      }
      await trx('columns').where({ id: columnId }).delete();
      const remainingColumns = allColumns.filter(c => c.id !== columnId);
      for (let i = 0; i < remainingColumns.length; i++) {
        await trx('columns').where({ id: remainingColumns[i].id }).update({ position: i });
      }
    });
  }
  
  async isTaskTypeValidForProject(projectId: number, taskType: string, trx?: Knex.Transaction): Promise<boolean> {
      if (!taskType) return true;
      const db = trx || this.knex;
      const typeRecord = await db('project_task_types').where({ project_id: projectId, name: taskType }).first();
      return !!typeRecord;
  }

  async addMemberToProject(projectId: number, addMemberDto: AddMemberDto): Promise<ProjectMemberWithUser> {
    const project = await this.knex('projects').where({ id: projectId }).first();
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found.`);

    const userToAdd = await this.knex('users').where({ email: addMemberDto.email }).first();
    if (!userToAdd) throw new NotFoundException(`User with email ${addMemberDto.email} not found.`);
    if (userToAdd.id === project.owner_id) throw new ConflictException('Cannot add the project owner as a member.');
    
    const existingMembership = await this.knex('project_members').where({ project_id: projectId, user_id: userToAdd.id }).first();
    if (existingMembership) throw new ConflictException(`User ${addMemberDto.email} is already a member of this project.`);
    
    const [newMember] = await this.knex('project_members').insert({ project_id: projectId, user_id: userToAdd.id, role: addMemberDto.role }).returning('*');
    
    return { ...newMember, user: userToAdd };
  }
  
  async getProjectMembers(projectId: number): Promise<ProjectMemberWithUser[]> {
    const membersData = await this.knex('project_members')
      .join('users', 'project_members.user_id', '=', 'users.id')
      .where('project_members.project_id', projectId)
      .select(
          'project_members.role', 
          'users.id', 
          'users.name', 
          'users.email', 
          'users.created_at', 
          'users.updated_at'
      )
      .orderBy('users.name', 'asc');
    
    return membersData.map(m => ({
        project_id: projectId,
        user_id: m.id,
        role: m.role,
        user: {
            id: m.id,
            name: m.name,
            email: m.email,
            created_at: m.created_at,
            updated_at: m.updated_at,
            password_hash: '' // Exclude password hash
        }
    }));
  }
}