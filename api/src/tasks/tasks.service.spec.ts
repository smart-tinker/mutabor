import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { EventsGateway } from '../events/events.gateway';
import { CommentsService } from '../comments/comments.service'; // Import CommentsService
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { KNEX_CONNECTION } from '../knex/knex.constants';

// --- Mocks ---
const mockKnexTransactionResult = { id: 'task-1', title: 'Moved Task', column_id: 'col-2', position: 0 }; // Example result

// Mock for the actual query builder chain for transaction objects
const mockTrxQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(), // Added andWhere
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
};

// Mock for the actual query builder chain for non-transactional queries
const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(), // Added andWhere
  leftJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn(),
  increment: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  count: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
};

// This is the main mock for the Knex instance itself.
interface MockKnexClient extends jest.Mock<any, any> {
  transaction: jest.Mock<any, any>;
}
const mockKnexClient = jest.fn((tableName) => mockQueryBuilder) as MockKnexClient;
// Define trxMock here to be referenced in beforeEach
const trxMock = jest.fn((trxTableName) => mockTrxQueryBuilder);
mockKnexClient.transaction = jest.fn(async (callback) => callback(trxMock));


const knexProvider = {
  provide: KNEX_CONNECTION,
  useValue: mockKnexClient // Use the main client mock
};

const mockEventsGateway = {
  emitTaskCreated: jest.fn(),
  emitTaskUpdated: jest.fn(),
  emitTaskMoved: jest.fn(),
};

const mockCommentsService = { // Mock for injected CommentsService
  createComment: jest.fn(),
  getCommentsForTask: jest.fn(),
};

const mockUser: any = { id: 'user-1', email: 'test@example.com', name: 'Test User' };
const mockProject: any = { project_id_val: 1, owner_id: 'user-1', task_prefix: 'TP' }; // project_id_val for aliased id
const mockColumn1: any = { id: 'col-1', project_id: 1 };
const mockTask: any = { id: 'task-1', human_readable_id: 'TP-1', task_number: 1, title: 'Test Task', position: 0, project_id: 1, column_id: 'col-1', creator_id: 'user-1' };
// --- End Mocks ---

describe('TasksService', () => {
  let service: TasksService;
  // No knexFn, assertions on mockKnexClient, mockQueryBuilder, mockTrxQueryBuilder
  let eventsGateway;

  beforeEach(async () => {
    // Reset all mocks (call counts, specific implementations like mockResolvedValueOnce)
    jest.clearAllMocks();

    // --- Re-establish default mock implementations AFTER jest.clearAllMocks() ---
    // Main Knex client
    mockKnexClient.mockImplementation((tableName) => mockQueryBuilder);
    trxMock.mockClear().mockImplementation((trxTableName) => mockTrxQueryBuilder); // Reset trxMock
    mockKnexClient.transaction.mockImplementation(async (callback) => callback(trxMock)); // Re-assign with reset trxMock

    // Query Builder (non-transactional)
    mockQueryBuilder.where = jest.fn().mockReturnThis();
    mockQueryBuilder.andWhere = jest.fn().mockReturnThis(); // Added andWhere
    mockQueryBuilder.leftJoin = jest.fn().mockReturnThis();
    mockQueryBuilder.select = jest.fn().mockReturnThis();
    mockQueryBuilder.first = jest.fn(); // To be defined in tests with mockResolvedValueOnce
    mockQueryBuilder.increment = jest.fn().mockReturnThis();
    mockQueryBuilder.returning = jest.fn(); // To be defined in tests
    mockQueryBuilder.count = jest.fn().mockReturnThis();
    (mockQueryBuilder.count() as any).first = jest.fn().mockResolvedValue({count: '0'}); // Default for count().first()
    mockQueryBuilder.insert = jest.fn().mockReturnThis();
    mockQueryBuilder.update = jest.fn().mockReturnThis();

    // Transactional Query Builder
    mockTrxQueryBuilder.where = jest.fn().mockReturnThis();
    mockTrxQueryBuilder.andWhere = jest.fn().mockReturnThis();
    mockTrxQueryBuilder.first = jest.fn(); // To be defined in tests
    mockTrxQueryBuilder.forUpdate = jest.fn().mockReturnThis();
    mockTrxQueryBuilder.increment = jest.fn().mockResolvedValue(1);
    mockTrxQueryBuilder.decrement = jest.fn().mockResolvedValue(1);
    mockTrxQueryBuilder.update = jest.fn().mockReturnThis();
    mockTrxQueryBuilder.returning = jest.fn().mockResolvedValue([mockKnexTransactionResult]); // Default return for trx update
    mockTrxQueryBuilder.insert = jest.fn().mockReturnThis();
    mockTrxQueryBuilder.select = jest.fn().mockReturnThis();
    mockTrxQueryBuilder.count = jest.fn().mockReturnThis();
    mockTrxQueryBuilder.leftJoin = jest.fn().mockReturnThis();

    // Other service mocks
    mockEventsGateway.emitTaskCreated.mockClear();
    mockEventsGateway.emitTaskUpdated.mockClear();
    mockEventsGateway.emitTaskMoved.mockClear();
    mockCommentsService.createComment.mockClear();
    mockCommentsService.getCommentsForTask.mockClear();


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        knexProvider,
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: CommentsService, useValue: mockCommentsService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    eventsGateway = module.get<EventsGateway>(EventsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTask', () => {
    const createTaskDto = { title: 'New Task', columnId: 'col-1', projectId: 1 };
    it('should create a task and emit event', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(mockProject); // project check
      mockQueryBuilder.first.mockResolvedValueOnce(mockColumn1); // column check
      mockQueryBuilder.returning.mockResolvedValueOnce([{ last_task_number: 1, task_prefix: 'TP' }]); // project update
      // tasksInColumn count is handled by the general mockQueryBuilder.count().first()
      mockQueryBuilder.returning.mockResolvedValueOnce([{ ...mockTask, title: 'New Task' }]); // task insert

      const result = await service.createTask(createTaskDto, mockUser);

      expect(mockKnexClient).toHaveBeenCalledWith('projects');
      expect(mockKnexClient).toHaveBeenCalledWith('columns');
      expect(mockKnexClient).toHaveBeenCalledWith('tasks');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({title: 'New Task'}));
      expect(eventsGateway.emitTaskCreated).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Task' }));
      expect(result.title).toBe('New Task');
    });
  });

  describe('updateTask', () => {
    const updateTaskDto = { title: "Updated Title" };
    it('should update a task and emit event', async () => {
        // Mocks for findTaskById
        mockQueryBuilder.first.mockResolvedValueOnce(mockTask); // task fetch
        mockQueryBuilder.first.mockResolvedValueOnce(mockProject); // project permission check
        // Mock for update itself
        mockQueryBuilder.returning.mockResolvedValueOnce([{...mockTask, ...updateTaskDto}]);

        const result = await service.updateTask(mockTask.id, updateTaskDto, mockUser);

        expect(mockQueryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({title: "Updated Title", updated_at: expect.any(Date)}));
        expect(eventsGateway.emitTaskUpdated).toHaveBeenCalledWith(result);
        expect(result.title).toBe("Updated Title");
    });
     it('should throw BadRequestException if trying to change columnId', async () => {
        mockQueryBuilder.first.mockResolvedValueOnce(mockTask);
        mockQueryBuilder.first.mockResolvedValueOnce(mockProject);
        await expect(service.updateTask(mockTask.id, { columnId: 'another-col-id' } as any, mockUser))
            .rejects.toThrow(BadRequestException);
    });
  });

  describe('moveTask', () => {
    const moveTaskDto = { newColumnId: 'col-2', newPosition: 0 };
    const mockColumn2: any = { id: 'col-2', name: 'In Progress', position: 1, project_id: 1 };

    it('should move a task within a transaction and emit event', async () => {
      mockTrxQueryBuilder.first.mockImplementationOnce(() => Promise.resolve(mockTask)); // taskToMove in trx
      mockTrxQueryBuilder.first.mockImplementationOnce(() => Promise.resolve(mockProject)); // project permission check in trx
      mockTrxQueryBuilder.first.mockImplementationOnce(() => Promise.resolve(mockColumn2)); // targetColumn in trx
      // mockTrxQueryBuilder.returning for the final task update is already set up

      const result = await service.moveTask(mockTask.id, moveTaskDto, mockUser);

      expect(mockKnexClient.transaction).toHaveBeenCalled();
      // const trxCallback = mockKnexClient.transaction.mock.calls[0][0];
      // const trxFn = await trxCallback(trxMock); // trxMock is passed directly

      expect(trxMock).toHaveBeenCalledWith('tasks'); // Now assert on trxMock directly
      expect(mockTrxQueryBuilder.decrement).toHaveBeenCalled();
      expect(mockTrxQueryBuilder.increment).toHaveBeenCalled();
      expect(mockTrxQueryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ column_id: 'col-2', position: 0 }));
      expect(eventsGateway.emitTaskMoved).toHaveBeenCalled();
      expect(result.column_id).toBe(moveTaskDto.newColumnId);
      expect(result.position).toBe(moveTaskDto.newPosition);
    });
  });
});
