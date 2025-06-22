import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockUser: any = { id: 'user-1', email: 'test@example.com', name: 'Test User', password: 'hashedpassword', created_at: new Date(), updated_at: new Date() };
const mockProject: any /* Project & { columns?: Column[] } */ = { id: 1, name: 'Test Project', taskPrefix: 'TP', lastTaskNumber: 0, ownerId: 'user-1', created_at: new Date(), updated_at: new Date() };
const mockColumn: any /* Column */ = { id: 'col-1', name: 'To Do', position: 0, projectId: 1, created_at: new Date(), updated_at: new Date() };
mockProject.columns = [mockColumn];


import { KNEX_CONNECTION } from '../knex/knex.constants';

// Mock Knex
// Mock for the actual query builder chain for transaction objects
const mockTrxQueryBuilder = {
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  join: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  commit: jest.fn().mockResolvedValue(undefined), // mock commit
  rollback: jest.fn().mockResolvedValue(undefined), // mock rollback
};

// Mock for the actual query builder chain for non-transactional queries
const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  select: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(), // Added for completeness if ever used non-transactionally
  returning: jest.fn(), // Added for completeness
};

// This is the main mock for the Knex instance itself.
// It needs to be a function (for knex('table')) AND have a transaction method.
interface MockKnexClient extends jest.Mock<any, any> {
  transaction: jest.Mock<any, any>;
}
const mockKnexClient = jest.fn((tableName) => mockQueryBuilder) as MockKnexClient;
mockKnexClient.transaction = jest.fn(async (callback) => callback(jest.fn((trxTableName) => mockTrxQueryBuilder)));


const knexProvider = {
  provide: KNEX_CONNECTION,
  useValue: mockKnexClient,
};


describe('ProjectsService', () => {
  let service: ProjectsService;
  // No knexFn needed here, assertions will be on mockKnexClient or mockQueryBuilder/mockTrxQueryBuilder

  beforeEach(async () => {
    // Reset all mocks (call counts, internal state of jest.fn(), etc.)
    jest.clearAllMocks();

    // Re-establish default mock implementations for query builders after jest.clearAllMocks()
    // For non-transactional query builder
    Object.values(mockQueryBuilder).forEach(m => { if (jest.isMockFunction(m)) m.mockReturnThis(); });
    mockQueryBuilder.first.mockReset(); // Reset any mockResolvedValueOnce etc.
    mockQueryBuilder.returning.mockReset();
    mockQueryBuilder.orderBy.mockReset().mockImplementation(function() { return Promise.resolve((this as any)._mockResult || []); });
    mockQueryBuilder.whereIn.mockReset().mockReturnThis(); // Ensure it's chainable

    // For transactional query builder
    Object.values(mockTrxQueryBuilder).forEach(m => { if (jest.isMockFunction(m)) m.mockReturnThis(); });
    mockTrxQueryBuilder.first.mockReset();
    mockTrxQueryBuilder.returning.mockReset();
    mockTrxQueryBuilder.commit.mockReset().mockResolvedValue(undefined);
    mockTrxQueryBuilder.rollback.mockReset().mockResolvedValue(undefined);

    // Reset the main knex client's implementation
    mockKnexClient.mockImplementation((tableName) => mockQueryBuilder);
    // Crucially, ensure 'transaction' property (which is a jest.fn) has its implementation reset for each test.
    // This re-assigns the mock implementation to the existing jest.fn() property.
    mockKnexClient.transaction.mockImplementation(async (callback) => callback(jest.fn((trxTableName) => mockTrxQueryBuilder)));


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        knexProvider,
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    it('should create a project with default columns within a transaction', async () => {
      const createDto = { name: 'New Project', prefix: 'NP' };
      const mockNewProjectDbResult = [{ id: 1, name: createDto.name, task_prefix: createDto.prefix, owner_id: mockUser.id, last_task_number: 0, created_at: new Date(), updated_at: new Date() }];
      const mockInsertedColumnsDbResult = [
        { id: 'uuid1', name: 'To Do', position: 0, project_id: 1, created_at: new Date(), updated_at: new Date() },
        { id: 'uuid2', name: 'In Progress', position: 1, project_id: 1, created_at: new Date(), updated_at: new Date() },
        { id: 'uuid3', name: 'Done', position: 2, project_id: 1, created_at: new Date(), updated_at: new Date() },
      ];

      mockTrxQueryBuilder.returning.mockResolvedValueOnce(mockNewProjectDbResult); // For project insert
      mockTrxQueryBuilder.returning.mockResolvedValueOnce(mockInsertedColumnsDbResult); // For columns insert

      const result = await service.createProject(createDto, mockUser);

      expect(mockKnexClient.transaction).toHaveBeenCalled();
      // The transaction callback is executed internally by the service method.
      // We directly assert the calls on mockTrxQueryBuilder.
      // We also need to ensure the mockTrxClient's function was called with 'projects' and 'columns' by the trx object.
      // This requires the trx object passed to the callback to be the specific mock: jest.fn((trxTableName) => mockTrxQueryBuilder)

      // Check that the function provided as trx was called with 'projects' and 'columns'
      // This is a bit indirect. The most important is that mockTrxQueryBuilder methods are called.
      // This part of the test might need to be more focused on the state changes or results
      // rather than the intermediate trx function calls if it becomes too complex to assert.

      // Assertions on what happened INSIDE the transaction (i.e., on mockTrxQueryBuilder)
      expect(mockTrxQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: createDto.name,
        task_prefix: createDto.prefix,
        owner_id: mockUser.id,
      }));
      // This will be the second call to insert on mockTrxQueryBuilder
      expect(mockTrxQueryBuilder.insert).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ name: 'To Do', project_id: 1 }),
        expect.objectContaining({ name: 'In Progress', project_id: 1 }),
        expect.objectContaining({ name: 'Done', project_id: 1 }),
      ]));
      expect(result).toEqual({ ...mockNewProjectDbResult[0], columns: mockInsertedColumnsDbResult });
    });
  });

  describe('findAllProjectsForUser', () => {
    it('should return projects owned by or member of for a user', async () => {
      const ownedProjects = [{ ...mockProject, id:1, owner_id: mockUser.id }];
      const memberProjects = [{ ...mockProject, id:2, name: "Member Project" }];

      // Mock for owner
      mockQueryBuilder.orderBy.mockResolvedValueOnce(ownedProjects);
      // Mock for member: knex('projects').join(...).where(...).select(...).orderBy(...)
      const memberOrderByMock = jest.fn().mockResolvedValueOnce(memberProjects);
      const memberSelectMock = { orderBy: memberOrderByMock };
      const memberWhereMock = { select: jest.fn().mockReturnValue(memberSelectMock) };
      mockQueryBuilder.join.mockReturnValueOnce({ where: jest.fn().mockReturnValue(memberWhereMock) });


      const result = await service.findAllProjectsForUser(mockUser);

      expect(mockKnexClient).toHaveBeenCalledWith('projects');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ owner_id: mockUser.id });
      // For the member part
      expect(mockKnexClient).toHaveBeenCalledWith('projects');
      expect(mockQueryBuilder.join).toHaveBeenCalledWith('project_members', 'projects.id', '=', 'project_members.project_id');
      // More specific assertions can be added for the join's where clause

      expect(result).toEqual(expect.arrayContaining([...ownedProjects, ...memberProjects]));
    });
  });

  describe('findProjectById', () => {
    const projectId = 1;
    const projectData = { ...mockProject, id: projectId, owner_id: mockUser.id };
    const columnsData = [ mockColumn ];
    const tasksData = [{ id: 'task-uuid-1', column_id: mockColumn.id, title: 'Task 1' }];

    it('should return a project with columns and tasks if user is owner', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(projectData); // Project fetch
      mockQueryBuilder.orderBy.mockResolvedValueOnce(columnsData); // Columns fetch
      mockQueryBuilder.orderBy.mockResolvedValueOnce(tasksData); // Tasks fetch


      const result = await service.findProjectById(projectId, mockUser);

      expect(mockKnexClient).toHaveBeenCalledWith('projects');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: projectId });
      expect(mockQueryBuilder.first).toHaveBeenCalledTimes(1); // For project

      expect(mockKnexClient).toHaveBeenCalledWith('columns');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ project_id: projectId });

      expect(mockKnexClient).toHaveBeenCalledWith('tasks');
      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('column_id', [mockColumn.id]);

      expect(result.id).toBe(projectId);
      expect(result.columns[0].tasks[0].title).toBe('Task 1');
    });

    it('should throw NotFoundException if project not found', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(null); // Project not found
      await expect(service.findProjectById(999, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner or member', async () => {
      const otherUser = { ...mockUser, id: 'user-2' };
      mockQueryBuilder.first.mockResolvedValueOnce({ ...projectData, owner_id: 'another-owner-id' }); // Project found, not owned
      mockQueryBuilder.first.mockResolvedValueOnce(null); // Not a member either

      await expect(service.findProjectById(projectId, otherUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
