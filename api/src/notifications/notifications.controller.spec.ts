import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('NotificationsController (Integration)', () => {
  let app: INestApplication;
  let serviceMock: Partial<NotificationsService>;

  const mockUser: Partial<User> = { id: 'user1', email: 'test@example.com', name: 'Test User' };

  // Mock implementation of canActivate for JwtAuthGuard
  const mockJwtAuthGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = mockUser; // Attach mock user to request
      return true; // Allow access
    },
  };

  beforeAll(async () => {
    serviceMock = {
      getUserNotifications: jest.fn().mockResolvedValue([]),
      markNotificationAsRead: jest.fn().mockImplementation((id, userId) => Promise.resolve({ id, recipientId: userId, isRead: true, text: 'Notification ' + id, createdAt: new Date(), updatedAt: new Date() })),
      markAllNotificationsAsRead: jest.fn().mockResolvedValue({ message: 'All notifications marked as read' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: serviceMock },
      ],
    })
    .overrideGuard(JwtAuthGuard) // Override the actual JwtAuthGuard
    .useValue(mockJwtAuthGuard)   // With our mock implementation
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
      const notifications = [{ id: '1', text: 'Test', isRead: false, recipientId: mockUser.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      (serviceMock.getUserNotifications as jest.Mock).mockResolvedValueOnce(notifications);

      return request(app.getHttpServer())
        .get('/notifications')
        .expect(200)
        .expect(res => {
          expect(res.body).toEqual(notifications);
          expect(serviceMock.getUserNotifications).toHaveBeenCalledWith(mockUser.id);
        });
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 'notifTestId';
      const expectedResponse = { id: notificationId, recipientId: mockUser.id, isRead: true, text: 'Notification ' + notificationId, createdAt: expect.any(String), updatedAt: expect.any(String) };
      (serviceMock.markNotificationAsRead as jest.Mock).mockResolvedValueOnce(expectedResponse);

      return request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .expect(200)
        .expect(res => {
          expect(res.body).toEqual(expectedResponse);
          expect(serviceMock.markNotificationAsRead).toHaveBeenCalledWith(notificationId, mockUser.id);
        });
    });
  });

  describe('POST /notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      (serviceMock.markAllNotificationsAsRead as jest.Mock).mockResolvedValueOnce({ message: 'All marked' });

      return request(app.getHttpServer())
        .post('/notifications/mark-all-read')
        .expect(201) // POST usually returns 201 on success if creating/updating a resource state globally
        .expect(res => {
            expect(res.body).toEqual({ message: 'All marked' });
            expect(serviceMock.markAllNotificationsAsRead).toHaveBeenCalledWith(mockUser.id);
        });
    });
  });
});
