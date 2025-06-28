import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import { NotificationRecord, CommentRecord } from '../types/db-records';
import { EventsGateway } from '../events/events.gateway';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly eventsGateway: EventsGateway,
    // Инжектируем ProjectsService, чтобы получить список участников проекта
    private readonly projectsService: ProjectsService,
  ) {}

  async createNotification(
    recipientId: string,
    text: string,
    sourceUrl: string,
    taskId?: string,
    trx?: Knex.Transaction,
  ): Promise<NotificationRecord> {
    const db = trx || this.knex;
    const notificationId = crypto.randomUUID();
    const newNotificationData = {
      id: notificationId,
      recipient_id: recipientId,
      text,
      source_url: sourceUrl,
      task_id: taskId,
    };

    const [notification] = await db('notifications').insert(newNotificationData).returning('*');

    this.eventsGateway.emitNotificationNew(notification);
    return notification;
  }

  async createMentionNotifications(comment: CommentRecord, taskTitle: string, projectId: number) {
    const regex = /@([a-zA-Z0-9_.-]+)/g;
    let match;
    const mentionedNames = new Set<string>();

    while ((match = regex.exec(comment.text)) !== null) {
      mentionedNames.add(match[1]);
    }

    if (mentionedNames.size === 0) return;
    
    // Получаем всех участников проекта одним запросом
    const members = await this.projectsService.getProjectMembers(projectId, comment.author_id);
    const owner = await this.knex('projects').where({id: projectId}).select('owner_id').first();
    const ownerInfo = await this.knex('users').where({id: owner.owner_id}).select('id', 'name', 'email').first();
    
    const allProjectUsers = [...members.map(m => m.user), ownerInfo];

    const usersToNotify = allProjectUsers.filter(user => 
        mentionedNames.has(user.name) && user.id !== comment.author_id
    );

    if (usersToNotify.length === 0) return;

    const sourceUrl = `/tasks/${comment.task_id}`; // Пример URL
    const authorName = comment.author?.name || 'Someone';
    const text = `You were mentioned by ${authorName} in a comment on task "${taskTitle}": "${comment.text.substring(0, 50)}..."`;

    for (const user of usersToNotify) {
      await this.createNotification(user.id, text, sourceUrl, comment.task_id);
    }
  }

  async getNotificationsForUser(userId: string): Promise<NotificationRecord[]> {
    return this.knex('notifications')
      .where({ recipient_id: userId })
      .orderBy('created_at', 'desc')
      .limit(50);
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationRecord> {
    const [notification] = await this.knex('notifications')
      .where({ id: notificationId, recipient_id: userId })
      .update({ is_read: true, updated_at: new Date() })
      .returning('*');
    
    if (notification) {
      this.eventsGateway.emitNotificationRead(notification);
    }
    return notification;
  }
}