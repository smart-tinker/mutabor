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
    const { projectId, columnId, title, description, assigneeId } = createTaskDto;

    // --- ИСПРАВЛЕНИЕ #1 ---
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
    const newTaskData = {
      id: taskId,
      title,
      description,
      human_readable_id: humanReadableId,
      task_number: taskNumber,
      position,
      project_id: project.project_id_val,
      column_id: columnId,
      creator_id: user.id,
      assignee_id: assigneeId || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [insertedTask] = await this.knex('tasks').insert(newTaskData).returning('*');
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
    const { columnId, ...updatableDto } = updateTaskDto;

    const [updatedDbTask] = await this.knex('tasks')
      .where({ id: taskId })
      .update({ ...updatableDto, updated_at: new Date() })
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