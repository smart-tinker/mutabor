import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { EventsGateway } from '../events/events.gateway'; // Import EventsGateway
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined for injection
import * as crypto from 'crypto'; // For UUID generation

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
  ) {
    const recipient = await this.knex('users').where({ id: recipientId }).first();
    if (!recipient) {
      console.error(`Recipient user with ID ${recipientId} not found for notification.`);
      return null; // Or throw an error, depending on desired behavior
    }

    const notificationId = crypto.randomUUID();
    const notificationData = {
      id: notificationId,
      recipient_id: recipientId, // Assuming column name is recipient_id
      text,
      source_url: sourceUrl, // Assuming column name is source_url
      task_id: taskId, // Assuming column name is task_id
      is_read: false, // Assuming column name is is_read
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [newNotification] = await this.knex('notifications')
      .insert(notificationData)
      .returning('*');

    if (newNotification) {
      this.eventsGateway.emitNotificationNew(newNotification, recipientId);
    }
    return newNotification;
  }

  async getUserNotifications(userId: string) {
    return this.knex('notifications')
      .where({ recipient_id: userId }) // Assuming column name is recipient_id
      .orderBy('created_at', 'desc'); // Assuming column name is created_at
  }

  async markNotificationAsRead(notificationId: string, userId: string) {
    const notification = await this.knex('notifications')
      .where({ id: notificationId })
      .first();

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found.`);
    }
    if (notification.recipient_id !== userId) { // Assuming column name is recipient_id
      throw new ForbiddenException('You cannot mark this notification as read.');
    }

    const [updatedNotification] = await this.knex('notifications')
      .where({ id: notificationId })
      .update({ is_read: true, updated_at: new Date() }) // Assuming column name is is_read
      .returning('*');

    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: string) {
    await this.knex('notifications')
      .where({ recipient_id: userId, is_read: false }) // Assuming column names
      .update({ is_read: true, updated_at: new Date() });

    return { message: 'All unread notifications marked as read.' };
  }
}
