import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto'; // Correct path
import { NotificationsService } from '../notifications/notifications.service'; // Import NotificationsService
import { EventsGateway } from '../events/events.gateway'; // Import EventsGateway
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined for injection
import * as crypto from 'crypto'; // For UUID generation
import { CommentRecord, UserRecord } from '../types/db-records'; // Import new types

@Injectable()
export class CommentsService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private notificationService: NotificationsService, // Inject NotificationsService
    private eventsGateway: EventsGateway, // Inject EventsGateway
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
    const newComment = {
      id: commentId,
      text: dto.text,
      task_id: taskId, // Assuming column name is task_id
      author_id: authorId, // Assuming column name is author_id
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.knex('comments').insert(newComment);

    const authorData = await this.knex('users')
      .where({ id: authorId })
      .select('id', 'name', 'email', 'created_at', 'updated_at') // Ensure all UserRecord fields
      .first();

    const author: UserRecord | undefined = authorData ? {
        id: authorData.id,
        name: authorData.name,
        email: authorData.email,
        created_at: new Date(authorData.created_at),
        updated_at: new Date(authorData.updated_at),
    } : undefined;


    const fullComment: CommentRecord = { ...newComment, author };

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
        'comments.task_id', // Ensure task_id is selected for CommentRecord
        'comments.author_id', // Ensure author_id is selected for CommentRecord
        'comments.created_at',
        'comments.updated_at',
        'users.id as user_id_for_author', // Use a distinct alias for user id from join
        'users.name as user_name_for_author',
        'users.email as user_email_for_author',
        'users.created_at as user_created_at_for_author', // Select user created_at
        'users.updated_at as user_updated_at_for_author'  // Select user updated_at
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
    const regex = /@([a-zA-Z0-9_.-]+)/g; // Assuming mention by name-like identifier
    const mentionedNames = new Set<string>();
    let match;

    // Ensure comment.text is not null or undefined before calling exec
    const textToParse = comment.text || '';
    while ((match = regex.exec(textToParse)) !== null) {
      mentionedNames.add(match[1]);
    }

    if (mentionedNames.size === 0) return;

    const usersToNotify = await this.knex('users')
      .whereIn('name', Array.from(mentionedNames))
      .andWhereNot('id', commentAuthorId)
      .select('id', 'name', 'email');

    const sourceUrl = `/projects/${projectId}/tasks/${comment.task_id}`; // Assuming comment.task_id from DB

    const authorName = comment.author?.name || 'Someone';
    const finalNotificationText = `You were mentioned by ${authorName} in a comment on task "${taskTitle}": "${comment.text.substring(0, 50)}..."`;

    for (const user of usersToNotify) {
      const isProjectMember = await this.knex('project_members') // Assuming table name project_members
        .where({ project_id: projectId, user_id: user.id }) // Assuming column names
        .first();

      const isProjectOwner = await this.knex('projects') // Assuming table name projects
        .where({ id: projectId, owner_id: user.id }) // Assuming column names
        .first();

      if (isProjectMember || isProjectOwner) {
           await this.notificationService.createNotification(
              user.id,
              finalNotificationText,
              sourceUrl,
              comment.task_id, // Assuming comment.task_id
           );
      }
    }
  }
}
