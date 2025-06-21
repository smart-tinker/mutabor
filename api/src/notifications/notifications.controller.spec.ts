import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto'; // Import crypto for UUID

describe('NotificationsController (Integration)', () => {
  let app: INestApplication;
  let serviceMock: Partial<NotificationsService>;

  const mockUser: any = { id: 'user1', email: 'test@example.com', name: 'Test User' }; // Replaced User with any

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
      const notificationId = crypto.randomUUID(); // Use valid UUID
      // Adjust to expect ISO string format for dates in response
      const expectedResponseObject = {
        id: notificationId,
        recipientId: mockUser.id,
        isRead: true,
        text: 'Notification ' + notificationId,
        // createdAt and updatedAt will be ISO strings from the actual service response
        // We'll check their presence and type rather than exact value with expect.any(String)
        // because the mock service returns new Date() which might not match supertest's deserialized string exactly.
      };
      const serviceResponse = {
        ...expectedResponseObject,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      (serviceMock.markNotificationAsRead as jest.Mock).mockResolvedValueOnce(serviceResponse);

      return request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .expect(200)
        .expect(res => {
          expect(res.body.id).toEqual(notificationId);
          expect(res.body.recipientId).toEqual(mockUser.id);
          expect(res.body.isRead).toBe(true);
          expect(res.body.text).toEqual('Notification ' + notificationId);
          expect(typeof res.body.createdAt).toBe('string');
          expect(typeof res.body.updatedAt).toBe('string');
          // Optional: Check if it's a valid ISO date string
          expect(new Date(res.body.createdAt).toISOString()).toEqual(res.body.createdAt);
          expect(new Date(res.body.updatedAt).toISOString()).toEqual(res.body.updatedAt);
          expect(serviceMock.markNotificationAsRead).toHaveBeenCalledWith(notificationId, mockUser.id);
        });
    });
  });

  describe('POST /notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      (serviceMock.markAllNotificationsAsRead as jest.Mock).mockResolvedValueOnce({ message: 'All marked' });

      return request(app.getHttpServer())
        .post('/notifications/mark-all-read')
        .expect(200) // Changed from 201 to 200 to match @HttpCode(HttpStatus.OK)
        .expect(res => {
            expect(res.body).toEqual({ message: 'All marked' });
            expect(serviceMock.markAllNotificationsAsRead).toHaveBeenCalledWith(mockUser.id);
        });
    });
  });
});
