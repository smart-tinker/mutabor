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
    private notificationService: NotificationsService,
    private eventsGateway: EventsGateway,
  ) {}

  async createComment(taskId: string, dto: CreateCommentDto, authorId: string): Promise<CommentRecord> {
    const taskData = await this.knex('tasks')
      .where({ id: taskId })
      .select('project_id', 'title')
      .first();

    if (!taskData) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    const commentId = crypto.randomUUID();
    const newCommentData = {
      id: commentId,
      text: dto.text,
      task_id: taskId,
      author_id: authorId,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.knex('comments').insert(newCommentData);

    const authorData = await this.knex('users')
      .where({ id: authorId })
      .select('id', 'name', 'email', 'created_at', 'updated_at')
      .first();

    const author: UserRecord | undefined = authorData ? {
        ...authorData,
        created_at: new Date(authorData.created_at),
        updated_at: new Date(authorData.updated_at),
    } : undefined;

    const fullComment: CommentRecord = {
        ...newCommentData,
        created_at: new Date(newCommentData.created_at),
        updated_at: new Date(newCommentData.updated_at),
        author,
    };

    if (fullComment) {
      this.handleMentions(fullComment, taskData.title, authorId, taskData.project_id);
      this.eventsGateway.emitCommentCreated(fullComment, taskData.project_id);
    }

    return fullComment;
  }

  async getCommentsForTask(taskId: string): Promise<CommentRecord[]> {
    const taskExists = await this.knex('tasks').where({ id: taskId }).first();
    if (!taskExists) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    const commentsFromDb = await this.knex('comments')
      .join('users', 'comments.author_id', '=', 'users.id')
      .where({ 'comments.task_id': taskId })
      .select(
        'comments.id',
        'comments.text',
        'comments.task_id',
        'comments.author_id',
        'comments.created_at',
        'comments.updated_at',
        'users.id as user_id_for_author',
        'users.name as user_name_for_author',
        'users.email as user_email_for_author',
        'users.created_at as user_created_at_for_author',
        'users.updated_at as user_updated_at_for_author'
      )
      .orderBy('comments.created_at', 'asc');

    return commentsFromDb.map(c => {
      const author: UserRecord = {
        id: c.user_id_for_author,
        name: c.user_name_for_author,
        email: c.user_email_for_author,
        created_at: new Date(c.user_created_at_for_author),
        updated_at: new Date(c.user_updated_at_for_author),
      };
      return {
        id: c.id,
        text: c.text,
        task_id: c.task_id,
        author_id: c.author_id,
        created_at: new Date(c.created_at),
        updated_at: new Date(c.updated_at),
        author,
      };
    });
  }

  private async handleMentions(comment: CommentRecord, taskTitle: string, commentAuthorId: string, projectId: number) {
    const regex = /@([a-zA-Z0-9_.-]+)/g;
    const mentionedNames = new Set<string>();
    let match;

    const textToParse = comment.text || '';
    while ((match = regex.exec(textToParse)) !== null) {
      mentionedNames.add(match[1]);
    }

    if (mentionedNames.size === 0) return;

    const projectOwner = await this.knex('projects').where({ id: projectId }).select('owner_id').first();
    const projectMembers = await this.knex('project_members').where({ project_id: projectId }).select('user_id');
    const validUserIds = new Set(projectMembers.map(m => m.user_id));
    if (projectOwner) {
      validUserIds.add(projectOwner.owner_id);
    }

    const usersToNotify = await this.knex('users')
      .whereIn('name', Array.from(mentionedNames))
      .whereIn('id', Array.from(validUserIds))
      .andWhereNot('id', commentAuthorId)
      .select('id', 'name', 'email');

    if (usersToNotify.length === 0) return;

    const sourceUrl = `/task/${comment.task_id}`;
    const authorName = comment.author?.name || 'Someone';
    const finalNotificationText = `You were mentioned by ${authorName} in a comment on task "${taskTitle}": "${comment.text.substring(0, 50)}..."`;

    for (const user of usersToNotify) {
      await this.notificationService.createNotification(
        user.id,
        finalNotificationText,
        sourceUrl,
        comment.task_id,
      );
    }
  }
}