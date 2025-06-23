import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { UserRecord, NotificationRecord } from '../types/db-records';

describe('NotificationsController (Integration)', () => {
  let app: INestApplication;
  let serviceMock: Partial<NotificationsService>;

  const mockUser: UserRecord = { id: 'user1', email: 'test@example.com', name: 'Test User', created_at: new Date(), updated_at: new Date() };

  const mockJwtAuthGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = mockUser;
      return true;
    },
  };

  beforeAll(async () => {
    serviceMock = {
      getUserNotifications: jest.fn().mockResolvedValue([]),
      markNotificationAsRead: jest.fn().mockImplementation((id: string, userId: string): Promise<NotificationRecord> => Promise.resolve({ id, recipient_id: userId, is_read: true, text: 'Notification ' + id, created_at: new Date(), updated_at: new Date(), source_url: null, task_id: null })),
      markAllNotificationsAsRead: jest.fn().mockResolvedValue({ message: 'All notifications marked as read' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: serviceMock }],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockJwtAuthGuard)
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    const controller = app.get<NotificationsController>(NotificationsController);
    expect(controller).toBeDefined();
  });

  describe('GET /notifications', () => {
    it('should return user notifications', async () => {
      const notifications = [{ id: '1', text: 'Test', is_read: false, recipient_id: mockUser.id, created_at: new Date(), updatedAt: new Date() }];
      (serviceMock.getUserNotifications as jest.Mock).mockResolvedValueOnce(notifications);
      return request(app.getHttpServer()).get('/notifications').expect(200).expect(res => {
          expect(res.body[0].id).toEqual(notifications[0].id);
          expect(serviceMock.getUserNotifications).toHaveBeenCalledWith(mockUser.id);
      });
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const notificationId = crypto.randomUUID();
      return request(app.getHttpServer()).patch(`/notifications/${notificationId}/read`).expect(200).expect(res => {
          expect(res.body.id).toEqual(notificationId);
          expect(res.body.is_read).toBe(true);
          expect(serviceMock.markNotificationAsRead).toHaveBeenCalledWith(notificationId, mockUser.id);
      });
    });
  });

  describe('POST /notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      (serviceMock.markAllNotificationsAsRead as jest.Mock).mockResolvedValueOnce({ message: 'All marked' });
      return request(app.getHttpServer()).post('/notifications/mark-all-read').expect(200).expect(res => {
          expect(res.body).toEqual({ message: 'All marked' });
          expect(serviceMock.markAllNotificationsAsRead).toHaveBeenCalledWith(mockUser.id);
      });
    });
  });
});