// api/src/tasks/tasks.service.ts

import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { EventsGateway } from '../events/events.gateway';
import { CommentsService } from '../comments/comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import { TaskRecord, UserRecord } from '../types/db-records';

// Helper to convert DB record to TaskRecord
function toTaskRecord(dbTask: any): TaskRecord {
    if (!dbTask) return null;
    return {
        ...dbTask,
        due_date: dbTask.due_date ? new Date(dbTask.due_date) : null,
        created_at: new Date(dbTask.created_at),
        updated_at: new Date(dbTask.updated_at),
    };
}

@Injectable()
export class TasksService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    @Inject(EventsGateway) private eventsGateway: EventsGateway,
    private commentsService: CommentsService,
  ) {}

  async createTask(createTaskDto: CreateTaskDto, user: UserRecord): Promise<TaskRecord> {
    const { title, description, columnId, projectId, assigneeId, dueDate, type, priority, tags } = createTaskDto;

    // --- ИСПРАВЛЕНИЕ #1 ---
    // Project and Column validation (existing logic is fine)
    const project = await this.knex('projects')
      .leftJoin('project_members', 'projects.id', 'project_members.project_id')
      .where('projects.id', projectId)
      .andWhere(function() {
        this.where('projects.owner_id', user.id)
            .orWhere('project_members.user_id', user.id);
      })
      .select('projects.id as project_id_val', 'projects.task_prefix')
      .first();

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found or user lacks access.`);
    }

    const column = await this.knex('columns').where({id: columnId, project_id: project.project_id_val}).first();
    if(!column) {
      throw new NotFoundException(`Column ${columnId} not found in project ${projectId}.`);
    }

    const [updatedProject] = await this.knex('projects')
      .where({ id: project.project_id_val })
      .increment('last_task_number', 1)
      .returning(['last_task_number', 'task_prefix']);

    const taskNumber = updatedProject.last_task_number;
    const humanReadableId = `${updatedProject.task_prefix}-${taskNumber}`;

    const tasksInColumn = await this.knex('tasks').where({ column_id: columnId }).count({ count: '*' }).first();
    const position = parseInt(tasksInColumn.count as string, 10);
    const taskId = crypto.randomUUID();

    // Explicit mapping from DTO to database record
    const newTaskDataForDb = {
      // Fields from DTO
      title: title,
      description: description || null,
      column_id: columnId, // DTO `columnId` maps to `column_id`
      project_id: project.project_id_val, // `projectId` from DTO used to fetch `project.project_id_val`
      assignee_id: assigneeId || null, // DTO `assigneeId` maps to `assignee_id`
      due_date: dueDate ? new Date(dueDate) : null, // DTO `dueDate` maps to `due_date`
      type: type || null,
      priority: priority || null,
      tags: tags || null, // Assuming DB driver handles array to TEXT[] or JSON

      // System-generated fields
      id: taskId,
      human_readable_id: humanReadableId,
      task_number: taskNumber,
      position: position,
      creator_id: user.id,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [insertedTask] = await this.knex('tasks').insert(newTaskDataForDb).returning('*');
    const newTask = toTaskRecord(insertedTask);

    this.eventsGateway.emitTaskCreated(newTask);
    return newTask;
  }

  async findTaskById(taskId: string, user: UserRecord): Promise<TaskRecord> {
    const taskFromDb = await this.knex('tasks').where({ id: taskId }).first();
    if (!taskFromDb) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    // --- ИСПРАВЛЕНИЕ #2 ---
    const projectAccess = await this.knex('projects')
        .leftJoin('project_members', 'projects.id', 'project_members.project_id')
        .where('projects.id', taskFromDb.project_id)
        .andWhere(function() {
            this.where('projects.owner_id', user.id)
                .orWhere('project_members.user_id', user.id);
        })
        .first();

    if (!projectAccess) {
      throw new ForbiddenException('You do not have permission to view this task.');
    }
    return toTaskRecord(taskFromDb);
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto, user: UserRecord): Promise<TaskRecord> {
    const task = await this.findTaskById(taskId, user); // Auth check included here

    if (updateTaskDto.columnId && updateTaskDto.columnId !== task.column_id) {
      throw new BadRequestException('To move a task, please use the dedicated move endpoint.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const { columnId, ...dtoToUpdate } = updateTaskDto; // Exclude columnId - old approach

    const updatePayloadForDb: Partial<Omit<TaskRecord, 'id' | 'created_at' | 'human_readable_id' | 'task_number' | 'project_id' | 'creator_id'>> = {};

    // Explicitly map fields from DTO to the database payload
    // Note: updateTaskDto.columnId is intentionally not handled here as per original logic (use /move endpoint)
    // However, if general column update was allowed, it would be:
    // if (updateTaskDto.columnId !== undefined) updatePayloadForDb.column_id = updateTaskDto.columnId;

    if (updateTaskDto.title !== undefined) updatePayloadForDb.title = updateTaskDto.title;

    if (updateTaskDto.description !== undefined) {
      updatePayloadForDb.description = updateTaskDto.description; // This can be string or null from DTO
    }

    if (updateTaskDto.assigneeId !== undefined) {
      updatePayloadForDb.assignee_id = updateTaskDto.assigneeId; // This can be string (UUID) or null
    }

    if (updateTaskDto.position !== undefined) updatePayloadForDb.position = updateTaskDto.position;

    if (updateTaskDto.dueDate !== undefined) {
      updatePayloadForDb.due_date = updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : null;
    }

    if (updateTaskDto.type !== undefined) {
      updatePayloadForDb.type = updateTaskDto.type; // string or null
    }

    if (updateTaskDto.priority !== undefined) {
      updatePayloadForDb.priority = updateTaskDto.priority; // string or null
    }

    if (updateTaskDto.tags !== undefined) {
      updatePayloadForDb.tags = updateTaskDto.tags; // string[] or null
    }

    // Check if any fields are actually being updated
    if (Object.keys(updatePayloadForDb).length === 0) {
      // If only updated_at needs to be touched, or no actual changes.
      // To ensure `updated_at` is modified even if no other field changes (e.g. if an empty DTO is sent),
      // we can proceed with an update call that only sets updated_at.
      // However, if the intent is "no change if payload is empty", then return task.
      // For now, let's assume an empty DTO means "no change to task fields", but we will still return the task.
      // If an explicit "touch" is needed, this logic might change.
      // The original code updated `updated_at` regardless. Let's stick to that.
       const [touchedDbTask] = await this.knex('tasks')
        .where({ id: taskId })
        .update({ updated_at: new Date() })
        .returning('*');
      return toTaskRecord(touchedDbTask);
    }

    updatePayloadForDb.updated_at = new Date(); // Add updated_at timestamp

    const [updatedDbTask] = await this.knex('tasks')
      .where({ id: taskId })
      .update(updatePayloadForDb)
      .returning('*');

    const updatedTask = toTaskRecord(updatedDbTask);
    this.eventsGateway.emitTaskUpdated(updatedTask);
    return updatedTask;
  }

  async moveTask(taskId: string, moveTaskDto: MoveTaskDto, user: UserRecord): Promise<TaskRecord> {
    const { newColumnId, newPosition } = moveTaskDto;

    return this.knex.transaction(async (trx) => {
      const taskToMoveFromDb = await trx('tasks').where({ id: taskId }).forUpdate().first();
      if (!taskToMoveFromDb) throw new NotFoundException(`Task with ID ${taskId} not found.`);
      const taskToMove = toTaskRecord(taskToMoveFromDb);

      // --- ИСПРАВЛЕНИЕ #3 ---
      const projectAccess = await trx('projects')
        .leftJoin('project_members', 'projects.id', 'project_members.project_id')
        .where('projects.id', taskToMove.project_id)
        .andWhere(function() {
            this.where('projects.owner_id', user.id)
                .orWhere('project_members.user_id', user.id);
        })
        .first();

      if (!projectAccess) {
        throw new ForbiddenException('You do not have permission to move tasks in this project.');
      }

      const targetColumn = await trx('columns').where({ id: newColumnId, project_id: taskToMove.project_id }).first();
      if (!targetColumn) {
        throw new NotFoundException(`Target column with ID ${newColumnId} not found or does not belong to the same project.`);
      }

      const oldColumnId = taskToMove.column_id;
      const oldPosition = taskToMove.position;

      await trx('tasks')
        .where({ column_id: oldColumnId })
        .andWhere('position', '>', oldPosition)
        .decrement('position');

      await trx('tasks')
        .where({ column_id: newColumnId })
        .andWhere('position', '>=', newPosition)
        .increment('position');

      const [finalMovedDbTask] = await trx('tasks')
        .where({ id: taskId })
        .update({
          column_id: newColumnId,
          position: newPosition,
          updated_at: new Date(),
        })
        .returning('*');

      const finalMovedTask = toTaskRecord(finalMovedDbTask);
      this.eventsGateway.emitTaskMoved(finalMovedTask);
      return finalMovedTask;
    });
  }

  async addCommentToTask(taskId: string, createCommentDto: CreateCommentDto, author: UserRecord) {
    const task = await this.knex('tasks').where({ id: taskId }).first();
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    // --- ИСПРАВЛЕНИЕ #4 ---
    const projectAccess = await this.knex('projects')
        .leftJoin('project_members', 'projects.id', 'project_members.project_id')
        .where('projects.id', task.project_id)
        .andWhere(function() {
            this.where('projects.owner_id', author.id)
                .orWhere('project_members.user_id', author.id);
        })
        .first();

    if (!projectAccess) {
      throw new ForbiddenException('You do not have permission to comment on this task.');
    }
    return this.commentsService.createComment(taskId, createCommentDto, author.id);
  }

  async getCommentsForTask(taskId: string, user: UserRecord) {
    const task = await this.knex('tasks').where({ id: taskId }).first();
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    // --- ИСПРАВЛЕНИЕ #5 ---
    const projectAccess = await this.knex('projects')
        .leftJoin('project_members', 'projects.id', 'project_members.project_id')
        .where('projects.id', task.project_id)
        .andWhere(function() {
            this.where('projects.owner_id', user.id)
                .orWhere('project_members.user_id', user.id);
        })
        .first();

    if (!projectAccess) {
      throw new ForbiddenException('You do not have permission to view comments for this task.');
    }
    return this.commentsService.getCommentsForTask(taskId);
  }
}