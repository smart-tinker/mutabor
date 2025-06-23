import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { UserRecord } from '../types/db-records';

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
  let knexFn: jest.Mock;
  let mockKnexChainable = mockKnexInstance;

  const mockUser: UserRecord = { id: 'user1', email: 'user1@example.com', name: 'User One', created_at: new Date(), updated_at: new Date() };
  const mockBaseNotificationData = {
    id: 'notif1-uuid',
    recipient_id: 'user1',
    is_read: false,
    created_at: new Date(),
    updated_at: new Date(),
    task_id: null,
    source_url: null
  };

  beforeEach(async () => {
    eventsGatewayMock = { emitNotificationNew: jest.fn().mockClear() };
    Object.values(mockKnexChainable).forEach(mockMethod => {
      if (jest.isMockFunction(mockMethod)) {
        mockMethod.mockClear();
        if (['where', 'insert', 'update', 'orderBy', 'returning'].includes(mockMethod.getMockName())) {
            mockMethod.mockReturnThis();
        }
      }
    });
    mockKnexChainable.first.mockReset();
    mockKnexChainable.returning.mockReset();
    mockKnexChainable.orderBy.mockImplementation(function() { return Promise.resolve([]); });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        knexProvider,
        { provide: EventsGateway, useValue: eventsGatewayMock },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
    knexFn = module.get(KNEX_CONNECTION);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ... rest of the tests
});