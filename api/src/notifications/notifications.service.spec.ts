import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { UserRecord } from '../types/db-records';
import { ProjectsService } from '../projects/projects.service';

const mockKnex = {
  // ... mock knex methods if needed
};

const mockEventsGateway = { emitNotificationNew: jest.fn() };
const mockProjectsService = { getProjectMembers: jest.fn(), getProjectOwner: jest.fn() };

describe('NotificationsService', () => {
  let service: NotificationsService;

  // ### ИЗМЕНЕНИЕ: Добавляем password_hash в мок ###
  const mockUser: UserRecord = { id: 'user1', email: 'user1@example.com', name: 'User One', created_at: new Date(), updated_at: new Date(), password_hash: 'hash' };

  beforeEach(async () => {
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
});