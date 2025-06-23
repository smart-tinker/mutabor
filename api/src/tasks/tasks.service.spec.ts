import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { EventsGateway } from '../events/events.gateway';
import { CommentsService } from '../comments/comments.service';
import { ProjectsService } from '../projects/projects.service';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { UserRecord, ProjectRecord, ColumnRecord, TaskRecord } from '../types/db-records';

const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), verbose: jest.fn() };
const mockKnexTransactionResult = { id: 'task-1', title: 'Moved Task', column_id: 'col-2', position: 0 };
const mockProjectsService = { ensureUserHasAccessToProject: jest.fn() };

const mockTrxQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  first: jest.fn(),
  forUpdate: jest.fn().mockReturnThis(),
  increment: jest.fn().mockResolvedValue(1),
  decrement: jest.fn().mockResolvedValue(1),
  update: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([mockKnexTransactionResult]),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  raw: jest.fn(),
};

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn(),
  increment: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  count: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  raw: jest.fn(),
};

interface MockKnexClient extends jest.Mock<any, any> {
  transaction: jest.Mock<any, any>;
}
const mockKnexClient = jest.fn((tableName) => mockQueryBuilder) as MockKnexClient;
const trxMock = jest.fn((trxTableName) => mockTrxQueryBuilder);
mockKnexClient.transaction = jest.fn(async (callback) => callback(trxMock));

const knexProvider = { provide: KNEX_CONNECTION, useValue: mockKnexClient };
const mockEventsGateway = { emitTaskCreated: jest.fn(), emitTaskUpdated: jest.fn(), emitTaskMoved: jest.fn() };
const mockCommentsService = { createComment: jest.fn(), getCommentsForTask: jest.fn() };
const mockUser: UserRecord = { id: 'user-1', email: 'test@example.com', name: 'Test User', created_at: new Date(), updated_at: new Date() };
const mockProject: Partial<ProjectRecord> = { id: 1, owner_id: 'user-1', task_prefix: 'TP' };
const mockColumn1: Partial<ColumnRecord> = { id: 'col-1', project_id: 1 };
const mockTask: TaskRecord = { id: 'task-1', human_readable_id: 'TP-1', task_number: 1, title: 'Test Task', position: 0, project_id: 1, column_id: 'col-1', creator_id: 'user-1', description: null, assignee_id: null, due_date: null, type: null, priority: null, tags: null, created_at: new Date(), updated_at: new Date() };

describe('TasksService', () => {
  let service: TasksService;
  let eventsGateway;

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.values(mockQueryBuilder).forEach(m => { if (jest.isMockFunction(m)) m.mockReset(); m.mockReturnThis?.(); });
    Object.values(mockTrxQueryBuilder).forEach(m => { if (jest.isMockFunction(m)) m.mockReset(); m.mockReturnThis?.(); });
    mockKnexClient.mockImplementation((tableName) => mockQueryBuilder);
    trxMock.mockClear().mockImplementation((trxTableName) => mockTrxQueryBuilder);
    mockKnexClient.transaction.mockImplementation(async (callback) => callback(trxMock));
    (mockQueryBuilder.count() as any).first = jest.fn().mockResolvedValue({count: '0'});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        knexProvider,
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: CommentsService, useValue: mockCommentsService },
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    (service as any).logger = mockLogger;
    eventsGateway = module.get<EventsGateway>(EventsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  // ... rest of the tests
});