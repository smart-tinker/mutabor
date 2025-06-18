import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway'; // Import EventsGateway

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway, // Inject EventsGateway
  ) {}

  async createNotification(
    recipientId: string,
    text: string,
    sourceUrl?: string,
    taskId?: string,
  ) {
    // Ensure recipient exists
    const recipient = await this.prisma.user.findUnique({ where: { id: recipientId }});
    if (!recipient) {
      // Log error, but maybe don't throw as it might break originating action (e.g. comment creation)
      console.error(`Recipient user with ID ${recipientId} not found for notification.`);
      return null;
    }

    const newNotification = await this.prisma.notification.create({
      data: {
        recipientId,
        text,
        sourceUrl,
        taskId, // Link to task if provided
        isRead: false,
      },
    });

    if (newNotification) {
      this.eventsGateway.emitNotificationNew(newNotification, recipientId);
    }
    return newNotification;
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markNotificationAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found.`);
    }
    if (notification.recipientId !== userId) {
      throw new ForbiddenException('You cannot mark this notification as read.');
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllNotificationsAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    // updateMany does not return the records, so we return a success message or count
    return { message: 'All unread notifications marked as read.' };
  }
}
