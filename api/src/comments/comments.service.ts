import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto'; // Correct path
import { NotificationsService } from '../notifications/notifications.service'; // Import NotificationsService
import { EventsGateway } from '../events/events.gateway'; // Import EventsGateway
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined for injection
import * as crypto from 'crypto'; // For UUID generation

@Injectable()
export class CommentsService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private notificationService: NotificationsService, // Inject NotificationsService
    private eventsGateway: EventsGateway, // Inject EventsGateway
  ) {}

  async createComment(taskId: string, dto: CreateCommentDto, authorId: string) {
    const taskData = await this.knex('tasks')
      .where({ id: taskId })
      .select('project_id', 'title') // Assuming columns are project_id and title
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

    const author = await this.knex('users').where({ id: authorId }).select('id', 'name', 'email').first();

    const fullComment = { ...newComment, author }; // Add author details to comment object

    if (fullComment) {
      this.handleMentions(fullComment, taskData.title, authorId, taskData.project_id);
      this.eventsGateway.emitCommentCreated(fullComment, taskData.project_id);
    }

    return fullComment;
  }

  async getCommentsForTask(taskId: string) {
    const taskExists = await this.knex('tasks').where({ id: taskId }).first();
    if (!taskExists) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    return this.knex('comments')
      .join('users', 'comments.author_id', '=', 'users.id')
      .where({ 'comments.task_id': taskId })
      .select(
        'comments.id',
        'comments.text',
        'comments.created_at',
        'comments.updated_at',
        'users.id as author_id', // Alias to avoid conflict if users.id is also selected directly
        'users.name as author_name',
        'users.email as author_email',
      )
      .orderBy('comments.created_at', 'asc')
      .then(comments => comments.map(c => ({
        id: c.id,
        text: c.text,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        author: {
          id: c.author_id,
          name: c.author_name,
          email: c.author_email,
        }
      })));
  }

  private async handleMentions(comment: any, taskTitle: string, commentAuthorId: string, projectId: number | string) {
    const regex = /@([a-zA-Z0-9_.-]+)/g;
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
