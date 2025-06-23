// api/src/tasks/tasks.service.ts

import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, Logger, forwardRef } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { EventsGateway } from '../events/events.gateway';
import { CommentsService } from '../comments/comments.service';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import { TaskRecord, UserRecord } from '../types/db-records';
import { ProjectsService } from '../projects/projects.service';

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
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    @Inject(EventsGateway) private eventsGateway: EventsGateway,
    private commentsService: CommentsService,
    @Inject(forwardRef(() => ProjectsService)) // <-- THE FIX IS HERE
    private projectsService: ProjectsService,
  ) {}

  async createTask(createTaskDto: CreateTaskDto, user: UserRecord): Promise<TaskRecord> {
    const { title, description, columnId, projectId, assigneeId, dueDate, type, priority, tags } = createTaskDto;

    return this.knex.transaction(async (trx) => {
      await this.projectsService.ensureUserHasAccessToProject(projectId, user.id, trx);

      const column = await trx('columns').where({id: columnId, project_id: projectId}).first();
      if(!column) {
        throw new NotFoundException(`Column ${columnId} not found in project ${projectId}.`);
      }

      const [updatedProject] = await trx('projects')
        .where({ id: projectId })
        .forUpdate()
        .increment('last_task_number', 1)
        .returning(['last_task_number', 'task_prefix']);

      const taskNumber = updatedProject.last_task_number;
      const humanReadableId = `${updatedProject.task_prefix}-${taskNumber}`;

      const tasksInColumn = await trx('tasks').where({ column_id: columnId }).count({ count: '*' }).first();
      const position = parseInt(tasksInColumn.count as string, 10);
      const taskId = crypto.randomUUID();

      const newTaskDataForDb = {
        title,
        description: description || null,
        column_id: columnId,
        project_id: projectId,
        assignee_id: assigneeId || null,
        due_date: dueDate ? new Date(dueDate) : null,
        type: type || null,
        priority: priority || null,
        tags: tags || null,
        id: taskId,
        human_readable_id: humanReadableId,
        task_number: taskNumber,
        position: position,
        creator_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [insertedTask] = await trx('tasks').insert(newTaskDataForDb).returning('*');
      const newTask = toTaskRecord(insertedTask);

      this.eventsGateway.emitTaskCreated(newTask);
      return newTask;
    });
  }

  async findTaskById(taskId: string, user: UserRecord): Promise<TaskRecord> {
    const taskFromDb = await this.knex('tasks').where({ id: taskId }).first();
    if (!taskFromDb) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    await this.projectsService.ensureUserHasAccessToProject(taskFromDb.project_id, user.id);

    return toTaskRecord(taskFromDb);
  }

  async findTaskByHumanId(humanReadableId: string, user: UserRecord): Promise<TaskRecord> {
    const taskFromDb = await this.knex('tasks').where({ human_readable_id: humanReadableId }).first();
    if (!taskFromDb) {
      throw new NotFoundException(`Task with ID ${humanReadableId} not found.`);
    }
    await this.projectsService.ensureUserHasAccessToProject(taskFromDb.project_id, user.id);
    return toTaskRecord(taskFromDb);
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto, user: UserRecord): Promise<TaskRecord> {
    const task = await this.findTaskById(taskId, user);

    if (updateTaskDto.columnId && updateTaskDto.columnId !== task.column_id) {
      throw new BadRequestException('To move a task, please use the dedicated move endpoint.');
    }

    const updatePayloadForDb: Partial<Omit<TaskRecord, 'id' | 'created_at' | 'human_readable_id' | 'task_number' | 'project_id' | 'creator_id'>> = {};

    if (updateTaskDto.title !== undefined) updatePayloadForDb.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) updatePayloadForDb.description = updateTaskDto.description;
    if (updateTaskDto.assigneeId !== undefined) updatePayloadForDb.assignee_id = updateTaskDto.assigneeId;
    if (updateTaskDto.position !== undefined) updatePayloadForDb.position = updateTaskDto.position;
    if (updateTaskDto.dueDate !== undefined) updatePayloadForDb.due_date = updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : null;
    if (updateTaskDto.type !== undefined) updatePayloadForDb.type = updateTaskDto.type;
    if (updateTaskDto.priority !== undefined) updatePayloadForDb.priority = updateTaskDto.priority;
    if (updateTaskDto.tags !== undefined) updatePayloadForDb.tags = updateTaskDto.tags;

    if (Object.keys(updatePayloadForDb).length === 0) {
      return task;
    }

    updatePayloadForDb.updated_at = new Date();

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

      await this.projectsService.ensureUserHasAccessToProject(taskToMove.project_id, user.id, trx);

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
    const task = await this.findTaskById(taskId, author);
    return this.commentsService.createComment(taskId, createCommentDto, author.id);
  }

  async getCommentsForTask(taskId: string, user: UserRecord) {
    await this.findTaskById(taskId, user);
    return this.commentsService.getCommentsForTask(taskId);
  }

  async updateTaskPrefixesForProject(
    projectId: number,
    oldPrefix: string,
    newPrefix: string,
    trx?: Knex.Transaction,
  ): Promise<number> {
    const db = trx || this.knex;

    const oldPrefixPattern = `${oldPrefix}-`;
    const newPrefixPattern = `${newPrefix}-`;

    const result = await db.raw(
      `UPDATE tasks
       SET
         human_readable_id = REPLACE(human_readable_id, ?, ?),
         updated_at = ?
       WHERE project_id = ? AND human_readable_id LIKE ?`,
      [oldPrefixPattern, newPrefixPattern, new Date(), projectId, `${oldPrefixPattern}%`]
    );

    const updatedCount = result.rowCount || 0;

    if (updatedCount > 0) {
        this.logger.log(`Updated prefix for ${updatedCount} tasks in project ${projectId} from ${oldPrefix} to ${newPrefixPattern.slice(0, -1)}.`);
    }

    return updatedCount;
  }
}