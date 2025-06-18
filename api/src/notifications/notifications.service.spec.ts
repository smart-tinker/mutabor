import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { User, Notification } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: {
    user: { findUnique: jest.Mock };
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let eventsGatewayMock: { emitNotificationNew: jest.Mock };

  const mockUser: User = { id: 'user1', email: 'user1@example.com', name: 'User One', password: 'pw', createdAt: new Date(), updatedAt: new Date() };
  const mockNotification: Notification = {
    id: 'notif1',
    text: 'Test notification',
    recipientId: 'user1',
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    taskId: null,
    sourceUrl: null
  };

  beforeEach(async () => {
    prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue(mockUser) },
      notification: {
        create: jest.fn().mockResolvedValue(mockNotification),
        findMany: jest.fn().mockResolvedValue([mockNotification]),
        findUnique: jest.fn().mockResolvedValue(mockNotification),
        update: jest.fn().mockResolvedValue({ ...mockNotification, isRead: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    eventsGatewayMock = { emitNotificationNew: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EventsGateway, useValue: eventsGatewayMock },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification and emit an event', async () => {
      const result = await service.createNotification('user1', 'New mention');
      expect(result?.text).toBe('New mention');
      expect(prismaMock.notification.create).toHaveBeenCalled();
      expect(eventsGatewayMock.emitNotificationNew).toHaveBeenCalledWith(result, 'user1');
    });

    it('should return null if recipient not found and log error', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await service.createNotification('unknown-user', 'Test');
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Recipient user with ID unknown-user not found for notification.');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getUserNotifications', () => {
    it('should return notifications for a user', async () => {
      const notifications = await service.getUserNotifications('user1');
      expect(notifications).toEqual([mockNotification]);
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { recipientId: 'user1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read if user is recipient', async () => {
      const result = await service.markNotificationAsRead('notif1', 'user1');
      expect(result.isRead).toBe(true);
      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif1' },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);
      await expect(service.markNotificationAsRead('unknown-notif', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not recipient', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({ ...mockNotification, recipientId: 'user2' });
      await expect(service.markNotificationAsRead('notif1', 'user1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      const result = await service.markAllNotificationsAsRead('user1');
      expect(result).toEqual({ message: 'All unread notifications marked as read.' });
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { recipientId: 'user1', isRead: false },
        data: { isRead: true },
      });
    });
  });
});
