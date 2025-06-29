// api/src/comments/comments.service.ts
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import { CommentRecord, UserRecord } from '../types/db-records';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly eventsGateway: EventsGateway, // EventsGateway нужен для оповещений
  ) {}

  async createComment(taskId: string, dto: CreateCommentDto, authorId: string): Promise<CommentRecord> {
    const task = await this.knex('tasks')
      .where({ id: taskId })
      .select('id', 'project_id')
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

    // Оповещаем другие системы через gateway
    this.eventsGateway.emitCommentCreated(fullComment, task.project_id);
    
    return fullComment;
  }

  async getCommentsForTask(taskId: string): Promise<CommentRecord[]> {
    const comments = await this.knex('comments')
      .where({ task_id: taskId })
      .orderBy('created_at', 'asc');
      
    const authorIds = [...new Set(comments.map(c => c.author_id).filter(Boolean))];
    if (authorIds.length === 0) {
        return comments.map(c => ({...c, author: null}));
    }
    const authors = await this.knex('users').whereIn('id', authorIds).select('id', 'name', 'email');
    const authorsMap = new Map(authors.map(a => [a.id, a]));

    return comments.map(comment => ({
      ...comment,
      author: comment.author_id ? authorsMap.get(comment.author_id) : undefined,
    }));
  }
}