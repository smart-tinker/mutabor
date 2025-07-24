// api/src/notifications/notifications.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { UserRecord } from '../types/db-records';
import { ProjectsService } from '../projects/projects.service';
import { NotFoundException } from '@nestjs/common';

const mockKnexReturning = { returning: jest.fn() };
const mockKnexUpdate = { update: jest.fn(() => mockKnexReturning) };
const mockKnexWhere = { where: jest.fn(() => mockKnexUpdate) };
const mockKnex = jest.fn(() => mockKnexWhere);


const mockEventsGateway = { emitNotificationNew: jest.fn(), emitNotificationRead: jest.fn() };
const mockProjectsService = { getProjectMembers: jest.fn(), getProjectOwner: jest.fn() };

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockUser: UserRecord = { id: 'user1', email: 'user1@example.com', name: 'User One', created_at: new Date(), updated_at: new Date(), password_hash: 'hash', role: 'user' };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockKnexReturning.returning.mockClear();
    mockKnexUpdate.update.mockClear();
    mockKnexWhere.where.mockClear();
    (mockKnex as jest.Mock).mockClear();


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: KNEX_CONNECTION, useValue: mockKnex },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markAllAsReadForUser', () => {
    it('should update all unread notifications for a user and emit events', async () => {
      const userId = 'user-with-notifications';
      const notificationsToUpdate = [
        { id: 'notif1', recipient_id: userId, is_read: true },
        { id: 'notif2', recipient_id: userId, is_read: true },
      ];

      mockKnexReturning.returning.mockResolvedValue(notificationsToUpdate);

      const result = await service.markAllAsReadForUser(userId);

      expect(result.updatedCount).toBe(2);
      expect(mockKnex).toHaveBeenCalledWith('notifications');
      expect(mockKnexWhere.where).toHaveBeenCalledWith({ recipient_id: userId, is_read: false });
      expect(mockKnexUpdate.update).toHaveBeenCalledWith(expect.objectContaining({ is_read: true }));
      expect(mockEventsGateway.emitNotificationRead).toHaveBeenCalledTimes(2);
      expect(mockEventsGateway.emitNotificationRead).toHaveBeenCalledWith(notificationsToUpdate[0]);
      expect(mockEventsGateway.emitNotificationRead).toHaveBeenCalledWith(notificationsToUpdate[1]);
    });

    it('should return 0 and not emit events if there are no unread notifications', async () => {
      const userId = 'user-without-notifications';
      mockKnexReturning.returning.mockResolvedValue([]);

      const result = await service.markAllAsReadForUser(userId);

      expect(result.updatedCount).toBe(0);
      expect(mockEventsGateway.emitNotificationRead).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if notification does not exist', async () => {
        const notificationId = 'non-existent-id';
        const userId = 'some-user';
        
        mockKnexReturning.returning.mockResolvedValue([]);
        
        await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(NotFoundException);
    });
  });
});