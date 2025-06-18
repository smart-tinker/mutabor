import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Получение всех уведомлений для текущего пользователя
  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  // Пометка одного уведомления как прочитанного
  async markAsRead(notificationId: string, userId: string) {
    // Сначала проверяем, что уведомление принадлежит пользователю, чтобы он не мог менять чужие
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientId: userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Уведомление с ID "${notificationId}" не найдено или не принадлежит вам.`,
      );
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });
  }
}