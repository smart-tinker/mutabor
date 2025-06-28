import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import { CommentRecord, UserRecord } from '../types/db-records';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createComment(taskId: string, dto: CreateCommentDto, authorId: string): Promise<CommentRecord> {
    const task = await this.knex('tasks')
      .where({ id: taskId })
      .select('id', 'project_id', 'title')
      .first();

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    const [newComment] = await this.knex('comments')
      .insert({
        id: crypto.randomUUID(),
        text: dto.text,
        task_id: taskId,
        author_id: authorId,
      })
      .returning('*');

    const author = await this.knex('users').where({ id: authorId }).select('id', 'name', 'email').first();
    const fullComment: CommentRecord = { ...newComment, author };
    
    // Оповещаем другие системы
    this.eventsGateway.emitCommentCreated(fullComment, task.project_id);
    await this.notificationsService.createMentionNotifications(fullComment, task.title, task.project_id);

    return fullComment;
  }

  async getCommentsForTask(taskId: string): Promise<CommentRecord[]> {
    const comments = await this.knex('comments')
      .where({ task_id: taskId })
      .orderBy('created_at', 'asc');
      
    const authorIds = [...new Set(comments.map(c => c.author_id))];
    const authors = await this.knex('users').whereIn('id', authorIds).select('id', 'name', 'email');
    const authorsMap = new Map(authors.map(a => [a.id, a]));

    return comments.map(comment => ({
      ...comment,
      author: authorsMap.get(comment.author_id),
    }));
  }

  // Здесь можно добавить методы updateComment и deleteComment,
  // которые также будут вызывать eventsGateway.emitCommentUpdated/Deleted
}