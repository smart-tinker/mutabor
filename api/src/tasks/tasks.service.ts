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
import { TaskRecord, UserRecord } from '../types/db-records'; // Import types

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

    const project = await this.knex('projects')
      .leftJoin('project_members', 'projects.id', 'project_members.project_id')
      .where('projects.id', projectId)
      .select('projects.id as project_id_val', 'projects.owner_id', 'projects.task_prefix', 'project_members.user_id as member_id')
      .first(builder => builder.where('projects.owner_id', user.id).orWhere('project_members.user_id', user.id));


    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found or user lacks access.`);

    const column = await this.knex('columns').where({id: columnId, project_id: project.project_id_val}).first();
    if(!column) throw new NotFoundException(`Column ${columnId} not found in project ${projectId}.`);


    const [updatedProject] = await this.knex('projects')
      .where({ id: project.project_id_val })
      .increment('last_task_number', 1)
      .returning(['last_task_number', 'task_prefix']);

    const taskNumber = updatedProject.last_task_number;
    const humanReadableId = `${updatedProject.task_prefix}-${taskNumber}`;

    const tasksInColumn = await this.knex('tasks').where({ column_id: columnId }).count({ count: '*' }).first();
    const position = parseInt(tasksInColumn.count as string, 10); // count returns string in some drivers

    const taskId = crypto.randomUUID();
    const newTaskData = {
      id: taskId,
      title,
      description,
      human_readable_id: humanReadableId, // Assuming column name
      task_number: taskNumber, // Assuming column name
      position,
      project_id: project.project_id_val, // Assuming column name
      column_id: columnId, // Assuming column name
      creator_id: user.id, // Assuming column name
      assignee_id: assigneeId || null, // Assuming column name
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

    const project = await this.knex('projects')
        .leftJoin('project_members', 'projects.id', 'project_members.project_id')
        .where('projects.id', taskFromDb.project_id)
        .select('projects.owner_id', 'project_members.user_id as member_id')
        .first(builder => builder.where('projects.owner_id', user.id).orWhere('project_members.user_id', user.id));

    if (!project) {
      throw new ForbiddenException('You do not have permission to view this task.');
    }
    return toTaskRecord(taskFromDb);
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto, user: UserRecord): Promise<TaskRecord> {
    const task = await this.findTaskById(taskId, user); // Auth check included & returns TaskRecord

    if (updateTaskDto.columnId && updateTaskDto.columnId !== task.column_id) { // task is now TaskRecord
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
      const taskToMove = toTaskRecord(taskToMoveFromDb); // Convert to TaskRecord for consistent use

      const project = await trx('projects')
        .leftJoin('project_members', 'projects.id', 'project_members.project_id')
        .where('projects.id', taskToMove.project_id)
        .select('projects.owner_id', 'project_members.user_id as member_id')
        .first(builder => builder.where('projects.owner_id', user.id).orWhere('project_members.user_id', user.id));

      if (!project) {
        throw new ForbiddenException('You do not have permission to move tasks in this project.');
      }

      const targetColumn = await trx('columns').where({ id: newColumnId, project_id: taskToMove.project_id }).first();
      if (!targetColumn) {
        throw new NotFoundException(`Target column with ID ${newColumnId} not found or does not belong to the same project.`);
      }

      const oldColumnId = taskToMove.column_id;
      const oldPosition = taskToMove.position;

      // Decrement positions in old column
      await trx('tasks')
        .where({ column_id: oldColumnId })
        .andWhere('position', '>', oldPosition)
        .decrement('position');

      // Increment positions in new column
      await trx('tasks')
        .where({ column_id: newColumnId })
        .andWhere('position', '>=', newPosition)
        .increment('position');

      // Update the task
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
    const task = await this.knex('tasks').where({ id: taskId }).first(); // Fetches the raw task
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    // Permission check based on the raw task's project_id
    const project = await this.knex('projects')
        .leftJoin('project_members', 'projects.id', 'project_members.project_id')
        .where('projects.id', task.project_id) // Use task.project_id from the fetched task
        .select('projects.owner_id', 'project_members.user_id as member_id')
        .first(builder => builder.where('projects.owner_id', author.id).orWhere('project_members.user_id', author.id));

    if (!project) {
      throw new ForbiddenException('You do not have permission to comment on this task.');
    }
    return this.commentsService.createComment(taskId, createCommentDto, author.id);
  }

  async getCommentsForTask(taskId: string, user: UserRecord) {
    const task = await this.knex('tasks').where({ id: taskId }).first(); // Fetches the raw task
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    // Permission check based on the raw task's project_id
    const project = await this.knex('projects')
        .leftJoin('project_members', 'projects.id', 'project_members.project_id')
        .where('projects.id', task.project_id) // Use task.project_id from the fetched task
        .select('projects.owner_id', 'project_members.user_id as member_id')
        .first(builder => builder.where('projects.owner_id', user.id).orWhere('project_members.user_id', user.id));

    if (!project) {
      throw new ForbiddenException('You do not have permission to view comments for this task.');
    }
    return this.commentsService.getCommentsForTask(taskId);
  }
}
