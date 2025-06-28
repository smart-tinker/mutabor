// api/src/tasks/tasks.service.ts
import { Injectable, NotFoundException, BadRequestException, Inject, Logger, forwardRef } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { EventsGateway } from '../events/events.gateway';
import { CommentsService } from '../comments/comments.service';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import { TaskRecord, UserRecord, ProjectRecord } from '../types/db-records';
import { ProjectsService } from '../projects/projects.service';
// ### ИСПРАВЛЕНИЕ: Импортируем Role напрямую из его источника ###
import { Role } from '../casl/roles.enum';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    @Inject(EventsGateway) private eventsGateway: EventsGateway,
    private commentsService: CommentsService,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
  ) {}

  async getTaskAndProjectForPermissionCheck(
    taskId: string,
    userId: string,
  ): Promise<{ task: TaskRecord; project: ProjectRecord; userRole: Role }> {
    const task = await this.knex('tasks').where({ id: taskId }).first();
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    const { project, userRole } = await this.projectsService.getProjectAndRole(task.project_id, userId);
    return { task, project, userRole };
  }

  async createTask(projectId: number, createTaskDto: CreateTaskDto, user: UserRecord): Promise<TaskRecord> {
    const { title, description, columnId, assigneeId, dueDate, type, priority, tags } = createTaskDto;

    return this.knex.transaction(async (trx) => {
      const column = await trx('columns').where({id: columnId, project_id: projectId}).first();
      if(!column) throw new BadRequestException(`Column with ID ${columnId} does not belong to project ${projectId}.`);

      if (type && !(await this.projectsService.isTaskTypeValidForProject(projectId, type, trx))) {
        throw new BadRequestException(`Task type '${type}' is not valid for this project.`);
      }

      const [updatedProject] = await trx('projects')
        .where({ id: projectId })
        .forUpdate()
        .increment('last_task_number', 1)
        .returning(['last_task_number', 'task_prefix']);

      const taskNumber = updatedProject.last_task_number;
      const humanReadableId = `${updatedProject.task_prefix}-${taskNumber}`;

      const tasksInColumnResult = await trx('tasks').where({ column_id: columnId }).count({ count: '*' }).first();
      const position = parseInt(tasksInColumnResult.count as string, 10);

      const [newTask] = await trx('tasks').insert({
        id: crypto.randomUUID(),
        title,
        description,
        column_id: columnId,
        project_id: projectId,
        assignee_id: assigneeId,
        due_date: dueDate ? new Date(dueDate) : null,
        type,
        priority,
        tags,
        human_readable_id: humanReadableId,
        task_number: taskNumber,
        position,
        creator_id: user.id,
      }).returning('*');

      this.eventsGateway.emitTaskCreated(newTask);
      return newTask;
    });
  }

  async findTaskById(taskId: string): Promise<TaskRecord> {
    const task = await this.knex('tasks').where({ id: taskId }).first();
    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found.`);
    return task;
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto): Promise<TaskRecord> {
    return this.knex.transaction(async (trx) => {
        const task = await trx('tasks').where({ id: taskId }).first();
        if (!task) throw new NotFoundException(`Task with ID ${taskId} not found.`);

        if (updateTaskDto.type && !(await this.projectsService.isTaskTypeValidForProject(task.project_id, updateTaskDto.type, trx))) {
            throw new BadRequestException(`Task type '${updateTaskDto.type}' is not valid for this project.`);
        }

        const { title, description, assigneeId, dueDate, type, priority, tags } = updateTaskDto;
        const updatePayload = {
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(assigneeId !== undefined && { assignee_id: assigneeId }),
            ...(dueDate !== undefined && { due_date: dueDate ? new Date(dueDate) : null }),
            ...(type !== undefined && { type }),
            ...(priority !== undefined && { priority }),
            ...(tags !== undefined && { tags }),
        };

        if (Object.keys(updatePayload).length === 0) return task;

        const [updatedTask] = await trx('tasks')
            .where({ id: taskId })
            .update({ ...updatePayload, updated_at: new Date() })
            .returning('*');

        this.eventsGateway.emitTaskUpdated(updatedTask);
        return updatedTask;
    });
  }

  async moveTask(taskId: string, moveTaskDto: MoveTaskDto): Promise<TaskRecord> {
    const { newColumnId, newPosition } = moveTaskDto;

    return this.knex.transaction(async (trx) => {
      const taskToMove = await trx('tasks').where({ id: taskId }).forUpdate().first();
      if (!taskToMove) throw new NotFoundException(`Task with ID ${taskId} not found.`);
      
      const targetColumn = await trx('columns').where({ id: newColumnId, project_id: taskToMove.project_id }).first();
      if (!targetColumn) throw new BadRequestException(`Target column with ID ${newColumnId} not found in this project.`);

      const oldColumnId = taskToMove.column_id;
      const oldPosition = taskToMove.position;

      await trx('tasks').where({ column_id: oldColumnId }).andWhere('position', '>', oldPosition).decrement('position');
      await trx('tasks').where({ column_id: newColumnId }).andWhere('position', '>=', newPosition).increment('position');

      const [finalMovedTask] = await trx('tasks')
        .where({ id: taskId })
        .update({ column_id: newColumnId, position: newPosition, updated_at: new Date() })
        .returning('*');

      this.eventsGateway.emitTaskMoved(finalMovedTask);
      return finalMovedTask;
    });
  }

  async addCommentToTask(taskId: string, createCommentDto: CreateCommentDto, author: UserRecord) {
    const task = await this.knex('tasks').where({ id: taskId }).first();
    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found.`);
    return this.commentsService.createComment(task.id, createCommentDto, author.id);
  }

  async getCommentsForTask(taskId: string) {
    const task = await this.knex('tasks').where({ id: taskId }).first();
    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found.`);
    return this.commentsService.getCommentsForTask(taskId);
  }

  async updateTaskPrefixesForProject(
    projectId: number,
    oldPrefix: string,
    newPrefix: string,
    trx: Knex.Transaction,
  ): Promise<number> {
    const oldPrefixPattern = `${oldPrefix}-`;
    const newPrefixPattern = `${newPrefix}-`;
    const result = await trx.raw(`
        UPDATE tasks
        SET human_readable_id = REPLACE(human_readable_id, ?, ?), updated_at = ?
        WHERE project_id = ? AND human_readable_id LIKE ?`,
        [oldPrefixPattern, newPrefixPattern, new Date(), projectId, `${oldPrefixPattern}%`]
    );
    return result.rowCount || 0;
  }
}