import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined
// import { User, Notification } from '@prisma/client'; // Types removed

// Mock Knex
const mockKnexInstance = {
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  update: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
};
const knexProvider = {
  provide: KNEX_CONNECTION,
  useValue: jest.fn().mockReturnValue(mockKnexInstance),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let eventsGatewayMock: { emitNotificationNew: jest.Mock };
  let knexFn: jest.Mock; // Will hold the main mock function: jest.fn().mockReturnValue(mockKnexChainable)
  let mockKnexChainable = mockKnexInstance; // mockKnexInstance is already the chainable object

  const mockUser = { id: 'user1', email: 'user1@example.com', name: 'User One' };
  const mockBaseNotificationData = { // Base for data returned from Knex
    id: 'notif1-uuid',
    // text: 'Test notification', // Text will vary per test
    recipient_id: 'user1',
    is_read: false,
    created_at: new Date(),
    updated_at: new Date(),
    task_id: null,
    source_url: null
  };

  beforeEach(async () => {
    eventsGatewayMock = { emitNotificationNew: jest.fn().mockClear() };

    // Reset all Knex method mocks in the chainable object
    Object.values(mockKnexChainable).forEach(mockMethod => {
      if (jest.isMockFunction(mockMethod)) {
        mockMethod.mockClear();
         // Re-chain methods that return `this`
        if (['where', 'insert', 'update', 'orderBy', 'select', 'join', 'whereIn', 'andWhereNot', 'returning', 'forUpdate', 'increment', 'decrement', 'count'].includes(mockMethod.getMockName() === 'jest.fn()' ? mockMethod.getMockImplementation()?.name || '' : mockMethod.name )) {
            mockMethod.mockReturnThis();
        }
      }
    });
     // Specifically reset mocks that return promises to clear mockResolvedValueOnce etc.
    mockKnexChainable.first.mockReset();
    mockKnexChainable.returning.mockReset(); // Important for insert/update returning
    // If orderBy is the end of a chain that's awaited/thenable:
    mockKnexChainable.orderBy.mockImplementation(function() { return Promise.resolve(this._mockResult || []); });


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        knexProvider, // knexProvider.useValue is jest.fn().mockReturnValue(mockKnexChainable)
        { provide: EventsGateway, useValue: eventsGatewayMock },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
    knexFn = module.get(KNEX_CONNECTION);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification and emit an event', async () => {
      const notificationText = 'New mention';
      const expectedNotification = { ...mockBaseNotificationData, text: notificationText, id: expect.any(String) };
      mockKnexChainable.first.mockResolvedValueOnce(mockUser); // For recipient check
      mockKnexChainable.returning.mockResolvedValueOnce([expectedNotification]); // For insert

      const result = await service.createNotification('user1', notificationText);

      expect(result?.text).toBe(notificationText);
      expect(knexFn).toHaveBeenCalledWith('users');
      expect(mockKnexChainable.where).toHaveBeenCalledWith({id: 'user1'});
      expect(mockKnexChainable.first).toHaveBeenCalledTimes(1);
      expect(knexFn).toHaveBeenCalledWith('notifications');
      expect(mockKnexChainable.insert).toHaveBeenCalledWith(expect.objectContaining({
        recipient_id: 'user1',
        text: notificationText
      }));
      expect(mockKnexChainable.returning).toHaveBeenCalledWith('*');
      expect(eventsGatewayMock.emitNotificationNew).toHaveBeenCalledWith(expectedNotification, 'user1');
    });

    it('should return null if recipient not found and log error', async () => {
      mockKnexChainable.first.mockResolvedValueOnce(null); // Recipient not found
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await service.createNotification('unknown-user', 'Test');
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Recipient user with ID unknown-user not found for notification.');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getUserNotifications', () => {
    it('should return notifications for a user', async () => {
      const expectedNotifications = [{ ...mockBaseNotificationData, text: "Notification 1"}];
      mockKnexChainable.orderBy.mockImplementationOnce(function() { return Promise.resolve(expectedNotifications); });

      const notifications = await service.getUserNotifications('user1');
      expect(notifications).toEqual(expectedNotifications);
      expect(knexFn).toHaveBeenCalledWith('notifications');
      expect(mockKnexChainable.where).toHaveBeenCalledWith({ recipient_id: 'user1' });
      expect(mockKnexChainable.orderBy).toHaveBeenCalledWith('created_at', 'desc');
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read if user is recipient', async () => {
      const notificationToMark = { ...mockBaseNotificationData, text: "Specific Notif" };
      mockKnexChainable.first.mockResolvedValueOnce(notificationToMark);
      mockKnexChainable.returning.mockResolvedValueOnce([{ ...notificationToMark, is_read: true }]);

      const result = await service.markNotificationAsRead('notif1-uuid', 'user1');
      expect(result.is_read).toBe(true);
      expect(knexFn).toHaveBeenCalledWith('notifications');
      // Called twice: once for find, once for update
      expect(mockKnexChainable.where).toHaveBeenCalledTimes(2);
      expect(mockKnexChainable.where).toHaveBeenNthCalledWith(1, { id: 'notif1-uuid' });
      expect(mockKnexChainable.first).toHaveBeenCalledTimes(1);
      expect(mockKnexChainable.where).toHaveBeenNthCalledWith(2, { id: 'notif1-uuid' });
      expect(mockKnexChainable.update).toHaveBeenCalledWith({ is_read: true, updated_at: expect.any(Date) });
      expect(mockKnexChainable.returning).toHaveBeenCalledWith('*');
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockKnexChainable.first.mockResolvedValueOnce(null);
      await expect(service.markNotificationAsRead('unknown-notif', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not recipient', async () => {
      mockKnexChainable.first.mockResolvedValueOnce({ ...mockBaseNotificationData, recipient_id: 'user2' });
      await expect(service.markNotificationAsRead('notif1-uuid', 'user1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      // Knex update without returning typically resolves with the number of affected rows
      mockKnexChainable.update.mockResolvedValueOnce(1);

      const result = await service.markAllNotificationsAsRead('user1');
      expect(result).toEqual({ message: 'All unread notifications marked as read.' });
      expect(knexFn).toHaveBeenCalledWith('notifications');
      expect(mockKnexChainable.where).toHaveBeenCalledWith({ recipient_id: 'user1', is_read: false });
      expect(mockKnexChainable.update).toHaveBeenCalledWith({ is_read: true, updated_at: expect.any(Date) });
    });
  });
});
