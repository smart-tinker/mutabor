import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject, forwardRef, Logger, BadRequestException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import { ProjectRecord, UserRecord, ProjectMemberWithUser, ColumnRecord } from '../types/db-records';
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

  // ... getProjectAndRole, createProject, findAllProjectsForUser, getProjectDetails, updateProjectSettings ...
  // (эти методы без изменений)

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

  async getProjectDetails(projectId: number, userId: string): Promise<ProjectDetailsDto> {
    const { project } = await this.getProjectAndRole(projectId, userId);

    const [columnsDb, tasksDb, taskTypesDb, owner, members] = await Promise.all([
      this.knex('columns').where({ project_id: projectId }).orderBy('position', 'asc'),
      this.knex('tasks').where({ project_id: projectId }).orderBy('position', 'asc'),
      this.knex('project_task_types').where({ project_id: projectId }).orderBy('id', 'asc'),
      this.knex('users').where({ id: project.owner_id }).select('id', 'name', 'email').first(),
      this.knex('project_members')
        .join('users', 'project_members.user_id', 'users.id')
        .where('project_members.project_id', projectId)
        .select('users.id', 'users.name', 'users.email', 'project_members.role')
    ]);

    const columns = columnsDb.map(col => ({
      id: col.id,
      name: col.name,
      position: col.position,
      tasks: tasksDb
        .filter(task => task.column_id === col.id)
        .map(task => ({
          id: task.id,
          human_readable_id: task.human_readable_id,
          title: task.title,
          position: task.position,
          assignee_id: task.assignee_id,
          type: task.type,
          priority: task.priority,
        })),
    }));

    return {
      id: project.id,
      name: project.name,
      prefix: project.prefix,
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
      },
      members: members.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
      })),
      columns,
      availableTaskTypes: taskTypesDb.map(t => t.name),
    };
  }

  async updateProjectSettings(
    projectId: number,
    userId: string,
    settingsDto: UpdateProjectSettingsDto,
  ): Promise<void> {
    return this.knex.transaction(async (trx) => {
      const { project, userRole } = await this.getProjectAndRole(projectId, userId, trx);
      if (userRole !== Role.Owner) {
        throw new ForbiddenException('Only the project owner can change project settings.');
      }

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

    // TODO: Эмитить WebSocket событие `column:created`
    return newColumn;
  }

  async updateColumn(projectId: number, columnId: string, updateColumnDto: UpdateColumnDto): Promise<ColumnRecord> {
    const column = await this.knex('columns').where({ id: columnId }).first();

    if (!column) {
      throw new NotFoundException(`Column with ID ${columnId} not found.`);
    }
    if (column.project_id !== projectId) {
      throw new ForbiddenException(`Column ${columnId} does not belong to project ${projectId}.`);
    }

    const [updatedColumn] = await this.knex('columns')
      .where({ id: columnId })
      .update({
        name: updateColumnDto.name,
        updated_at: new Date(),
      })
      .returning('*');
    
    // TODO: Эмитить WebSocket событие `column:updated`
    return updatedColumn;
  }

  async deleteColumn(projectId: number, columnId: string): Promise<void> {
    return this.knex.transaction(async (trx) => {
      // 1. Получаем все колонки проекта, чтобы проверить условия
      const allColumns = await trx('columns').where({ project_id: projectId }).orderBy('position', 'asc');
      
      // 2. Бизнес-правило: в проекте должно быть минимум 2 колонки
      if (allColumns.length <= 2) {
        throw new BadRequestException('Cannot delete column. A project must have at least two columns.');
      }

      const columnToDelete = allColumns.find(c => c.id === columnId);
      if (!columnToDelete) {
        // Если колонки нет, считаем операцию успешной (цель достигнута)
        return;
      }

      // 3. Определяем целевую колонку для перемещения задач
      let targetColumn: ColumnRecord;
      const columnIndex = allColumns.findIndex(c => c.id === columnId);
      
      if (columnIndex > 0) {
        // Есть предыдущая колонка - используем ее
        targetColumn = allColumns[columnIndex - 1];
      } else {
        // Это первая колонка, используем следующую
        targetColumn = allColumns[1];
      }

      // 4. Перемещаем задачи
      const tasksToMove = await trx('tasks').where({ column_id: columnId });
      if (tasksToMove.length > 0) {
        const maxPosInTarget = await trx('tasks')
          .where({ column_id: targetColumn.id })
          .max('position as max_pos')
          .first();
        
        let currentPos = (maxPosInTarget?.max_pos ?? -1) + 1;

        // Обновляем каждую задачу с новым column_id и position
        for (const task of tasksToMove) {
          await trx('tasks').where({ id: task.id }).update({
            column_id: targetColumn.id,
            position: currentPos++,
          });
        }
      }

      // 5. Удаляем пустую колонку
      await trx('columns').where({ id: columnId }).delete();
      
      // 6. Обновляем позиции оставшихся колонок, чтобы не было "дыр"
      const remainingColumns = allColumns.filter(c => c.id !== columnId);
      for (let i = 0; i < remainingColumns.length; i++) {
        await trx('columns').where({ id: remainingColumns[i].id }).update({ position: i });
      }

      // TODO: Эмитить WebSocket события `tasks:moved`, `column:deleted`
    });
  }
  
  async isTaskTypeValidForProject(projectId: number, taskType: string, trx?: Knex.Transaction): Promise<boolean> {
      if (!taskType) return true;
      const db = trx || this.knex;
      const typeRecord = await db('project_task_types').where({ project_id: projectId, name: taskType }).first();
      return !!typeRecord;
  }

  async addMemberToProject(projectId: number, addMemberDto: AddMemberDto, currentUserId: string): Promise<ProjectMemberWithUser> {
    const project = await this.knex('projects').where({ id: projectId }).first();
    const userToAdd = await this.knex('users').where({ email: addMemberDto.email }).first();
    if (!userToAdd) throw new NotFoundException(`User with email ${addMemberDto.email} not found.`);
    if (userToAdd.id === project.owner_id) throw new ConflictException('Cannot add the project owner as a member.');

    const existingMembership = await this.knex('project_members').where({ project_id: projectId, user_id: userToAdd.id }).first();
    if (existingMembership) throw new ConflictException(`User ${addMemberDto.email} is already a member of this project.`);

    const [newMember] = await this.knex('project_members').insert({ project_id: projectId, user_id: userToAdd.id, role: addMemberDto.role }).returning('*');
    
    const { password_hash, ...userFields } = userToAdd;
    return { ...newMember, user: userFields };
  }

  async getProjectMembers(projectId: number, currentUserId: string): Promise<Array<{ role: string; user: Omit<UserRecord, 'password_hash'> }>> {
    const members = await this.knex('project_members')
      .join('users', 'project_members.user_id', '=', 'users.id')
      .where('project_members.project_id', projectId)
      .select('project_members.role', 'users.id', 'users.name', 'users.email', 'users.created_at', 'users.updated_at')
      .orderBy('users.name', 'asc');
    
    return members.map(m => ({ role: m.role, user: m }));
  }
}