import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { NotificationRecord } from '../types/db-records';

describe('NotificationsController', () => {
  let app: INestApplication;
  let serviceMock: Partial<NotificationsService>;

  const mockUser: AuthenticatedUser = { id: 'user1', email: 'test@example.com', name: 'Test User' };

  beforeAll(async () => {
    // ### ИЗМЕНЕНИЕ: Мокаем только существующие методы ###
    serviceMock = {
      getNotificationsForUser: jest.fn().mockResolvedValue([]),
      markAsRead: jest.fn().mockImplementation((id: string, userId: string): Promise<NotificationRecord> => Promise.resolve({ id, recipient_id: userId, is_read: true, text: 'Notification ' + id, created_at: new Date(), updated_at: new Date(), source_url: null, task_id: null })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: serviceMock }],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: (context) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockUser;
        return true;
      }
    })
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
      (serviceMock.getNotificationsForUser as jest.Mock).mockResolvedValueOnce(notifications);
      return request(app.getHttpServer()).get('/api/v1/notifications').expect(200).expect(res => {
          expect(res.body[0].id).toEqual(notifications[0].id);
          expect(serviceMock.getNotificationsForUser).toHaveBeenCalledWith(mockUser.id);
      });
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const notificationId = crypto.randomUUID();
      return request(app.getHttpServer()).patch(`/api/v1/notifications/${notificationId}/read`).expect(200).expect(res => {
          expect(res.body.id).toEqual(notificationId);
          expect(res.body.is_read).toBe(true);
          expect(serviceMock.markAsRead).toHaveBeenCalledWith(notificationId, mockUser.id);
      });
    });
  });
});