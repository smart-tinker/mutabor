import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { ForbiddenException, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { TasksService } from '../tasks/tasks.service';
import { UserRecord, ProjectRecord, ColumnRecord } from '../types/db-records';

const mockUser: UserRecord = { id: 'user-1', email: 'test@example.com', name: 'Test User', created_at: new Date(), updated_at: new Date() };
const mockProject: ProjectRecord & { columns?: ColumnRecord[] } = { id: 1, name: 'Test Project', task_prefix: 'TP', last_task_number: 0, owner_id: 'user-1', created_at: new Date(), updated_at: new Date(), settings_statuses: null, settings_types: null };
const mockColumn: ColumnRecord = { id: 'col-1', name: 'To Do', position: 0, project_id: 1, created_at: new Date(), updated_at: new Date() };
mockProject.columns = [mockColumn];

const mockTasksService = {
  updateTaskPrefixesForProject: jest.fn(),
};

const mockLogger = {
  log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), verbose: jest.fn(),
};

const mockTrxQueryBuilder = {
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereNot: jest.fn().mockReturnThis(),
  first: jest.fn(),
  join: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockReturnThis(),
};

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  select: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn(),
};

interface MockKnexClient extends jest.Mock<any, any> {
  transaction: jest.Mock<any, any>;
}
const mockKnexClient = jest.fn((tableName) => mockQueryBuilder) as MockKnexClient;
mockKnexClient.transaction = jest.fn(async (callback) => callback(jest.fn((trxTableName) => mockTrxQueryBuilder)));

const knexProvider = { provide: KNEX_CONNECTION, useValue: mockKnexClient };

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.values(mockQueryBuilder).forEach(m => { if (jest.isMockFunction(m)) m.mockReturnThis(); });
    mockQueryBuilder.first.mockReset();
    mockQueryBuilder.returning.mockReset();
    mockQueryBuilder.orderBy.mockReset().mockImplementation(function() { return Promise.resolve([]); });
    Object.values(mockTrxQueryBuilder).forEach(m => { if (jest.isMockFunction(m)) m.mockReturnThis(); });
    mockTrxQueryBuilder.first.mockReset();
    mockTrxQueryBuilder.returning.mockReset();
    mockTrxQueryBuilder.commit.mockReset().mockResolvedValue(undefined);
    mockTrxQueryBuilder.rollback.mockReset().mockResolvedValue(undefined);
    mockKnexClient.mockImplementation((tableName) => mockQueryBuilder);
    mockKnexClient.transaction.mockImplementation(async (callback) => callback(jest.fn((trxTableName) => mockTrxQueryBuilder)));
    mockTasksService.updateTaskPrefixesForProject.mockReset();
    Object.values(mockLogger).forEach(mockFn => { if (jest.isMockFunction(mockFn)) mockFn.mockReset(); });

    const module: TestingModule = await Test.createTestingModule({
      providers: [ ProjectsService, knexProvider, { provide: TasksService, useValue: mockTasksService }, { provide: Logger, useValue: mockLogger } ],
    }).compile();
    service = module.get<ProjectsService>(ProjectsService);
    (service as any).logger = mockLogger;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ... other tests
});