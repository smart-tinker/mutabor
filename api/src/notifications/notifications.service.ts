import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { EventsGateway } from '../events/events.gateway'; // Import EventsGateway
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined for injection
import * as crypto from 'crypto'; // For UUID generation
import { NotificationRecord } from '../types/db-records'; // Import NotificationRecord

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private eventsGateway: EventsGateway, // Inject EventsGateway
  ) {}

  async createNotification(
    recipientId: string,
    text: string,
    sourceUrl?: string,
    taskId?: string,
  ): Promise<NotificationRecord | null> {
    const recipient = await this.knex('users').where({ id: recipientId }).first();
    if (!recipient) {
      console.error(`Recipient user with ID ${recipientId} not found for notification.`);
      return null;
    }

    const notificationId = crypto.randomUUID();
    const notificationData = {
      id: notificationId,
      recipient_id: recipientId,
      text,
      source_url: sourceUrl,
      task_id: taskId,
      is_read: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [insertedRow] = await this.knex('notifications')
      .insert(notificationData)
      .returning('*');

    const newNotification: NotificationRecord = {
        ...insertedRow,
        created_at: new Date(insertedRow.created_at),
        updated_at: new Date(insertedRow.updated_at),
    };

    if (newNotification) {
      this.eventsGateway.emitNotificationNew(newNotification, recipientId);
    }
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<NotificationRecord[]> {
    const notifications = await this.knex('notifications')
      .where({ recipient_id: userId })
      .orderBy('created_at', 'desc');
    return notifications.map(n => ({
        ...n,
        created_at: new Date(n.created_at),
        updated_at: new Date(n.updated_at),
    }));
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<NotificationRecord> {
    const notificationFromDb = await this.knex('notifications')
      .where({ id: notificationId })
      .first();

    if (!notificationFromDb) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found.`);
    }
    if (notificationFromDb.recipient_id !== userId) {
      throw new ForbiddenException('You cannot mark this notification as read.');
    }

    const [updatedRow] = await this.knex('notifications')
      .where({ id: notificationId })
      .update({ is_read: true, updated_at: new Date() })
      .returning('*');

    return {
        ...updatedRow,
        created_at: new Date(updatedRow.created_at),
        updated_at: new Date(updatedRow.updated_at),
    };
  }

  async markAllNotificationsAsRead(userId: string): Promise<{ message: string }> {
    await this.knex('notifications')
      .where({ recipient_id: userId, is_read: false })
      .update({ is_read: true, updated_at: new Date() });

    return { message: 'All unread notifications marked as read.' };
  }
}
