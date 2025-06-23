import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService, ProjectSettingsDTO } from './projects.service'; // Import ProjectSettingsDTO
import { ForbiddenException, NotFoundException, Logger } from '@nestjs/common'; // Import Logger

const mockUser: any = { id: 'user-1', email: 'test@example.com', name: 'Test User', password: 'hashedpassword', created_at: new Date(), updated_at: new Date() };
const mockProject: any /* Project & { columns?: Column[] } */ = { id: 1, name: 'Test Project', task_prefix: 'TP', last_task_number: 0, owner_id: 'user-1', created_at: new Date(), updated_at: new Date() };
const mockColumn: any /* Column */ = { id: 'col-1', name: 'To Do', position: 0, projectId: 1, created_at: new Date(), updated_at: new Date() };
mockProject.columns = [mockColumn];


import { KNEX_CONNECTION } from '../knex/knex.constants';

import { TasksService } from '../tasks/tasks.service'; // Import TasksService
import { ConflictException } from '@nestjs/common'; // Import ConflictException

// Mock TasksService
const mockTasksService = {
  updateTaskPrefixesForProject: jest.fn(),
};

// Mock Logger
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  setLogLevels: jest.fn(), // Added to satisfy LoggerService interface if needed by NestJS internally
};


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


    // Reset mockTasksService calls
    mockTasksService.updateTaskPrefixesForProject.mockReset();
    // Reset Logger mocks
    Object.values(mockLogger).forEach(mockFn => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockReset();
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        knexProvider,
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: Logger, // Provide the mock logger
          useValue: mockLogger,
        }
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    // Manually inject logger into the service instance for testing private logger property
    (service as any).logger = mockLogger;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    it('should create a project with default statuses as columns and settings within a transaction', async () => {
      const createDto = { name: 'New Project', prefix: 'NP' };
      const defaultStatuses = ['To Do', 'In Progress', 'Done'];
      const defaultTypes = ['Task', 'Bug', 'Feature'];
      const mockNewProjectDbResult = [{
        id: 1,
        name: createDto.name,
        task_prefix: createDto.prefix.toUpperCase(), // prefix is uppercased
        owner_id: mockUser.id,
        last_task_number: 0,
        settings_statuses: JSON.stringify(defaultStatuses),
        settings_types: JSON.stringify(defaultTypes),
        created_at: new Date(),
        updated_at: new Date()
      }];
      const mockInsertedColumnsDbResult = defaultStatuses.map((name, index) => ({
        id: `uuid${index+1}`, name, position: index, project_id: 1, created_at: new Date(), updated_at: new Date()
      }));

      mockTrxQueryBuilder.returning
        .mockResolvedValueOnce(mockNewProjectDbResult) // For project insert
        .mockResolvedValueOnce(mockInsertedColumnsDbResult); // For columns insert

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
        task_prefix: createDto.prefix.toUpperCase(),
        owner_id: mockUser.id,
        settings_statuses: JSON.stringify(defaultStatuses),
        settings_types: JSON.stringify(defaultTypes),
      }));
      // This will be the second call to insert on mockTrxQueryBuilder
      expect(mockTrxQueryBuilder.insert).toHaveBeenCalledWith(expect.arrayContaining(
        defaultStatuses.map(statusName => expect.objectContaining({ name: statusName, project_id: 1 }))
      ));

      const expectedResultProject = {
        ...mockNewProjectDbResult[0],
        // these are parsed by parseProjectSettings
        settings_statuses: defaultStatuses,
        settings_types: defaultTypes,
        // Ensure dates are Date objects
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      };
      const expectedResultColumns = mockInsertedColumnsDbResult.map(col => ({
        ...col,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      }));

      expect(result).toEqual({ ...expectedResultProject, columns: expectedResultColumns });
    });
  });

  describe('findAllProjectsForUser', () => {
    it('should return projects owned by or member of for a user, with parsed settings', async () => {
      const ownedProjectRaw = { ...mockProject, id:1, owner_id: mockUser.id, settings_statuses: JSON.stringify(['s1']), settings_types: JSON.stringify(['t1']) };
      const memberProjectRaw = { ...mockProject, id:2, name: "Member Project", settings_statuses: null, settings_types: null }; // Test null settings

      mockQueryBuilder.orderBy.mockResolvedValueOnce([ownedProjectRaw]); // owned

      const memberOrderByMock = jest.fn().mockResolvedValueOnce([memberProjectRaw]); // member
      const memberSelectMock = { orderBy: memberOrderByMock };
      const memberWhereMock = { select: jest.fn().mockReturnValue(memberSelectMock) };
      mockQueryBuilder.join.mockReturnValueOnce({ where: jest.fn().mockReturnValue(memberWhereMock) });


      const result = await service.findAllProjectsForUser(mockUser);

      expect(mockKnexClient).toHaveBeenCalledWith('projects');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ owner_id: mockUser.id });
      expect(mockKnexClient).toHaveBeenCalledWith('projects');
      expect(mockQueryBuilder.join).toHaveBeenCalledWith('project_members', 'projects.id', '=', 'project_members.project_id');

      expect(result.length).toBe(2);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 1, settings_statuses: ['s1'], settings_types: ['t1'] }),
        expect.objectContaining({ id: 2, settings_statuses: ['To Do', 'In Progress', 'Done'], settings_types: ['Task', 'Bug', 'Feature'] }), // Defaults
      ]));
    });
  });

  describe('findProjectById', () => {
    const projectId = 1;
    const projectDataRaw = { ...mockProject, id: projectId, owner_id: mockUser.id, settings_statuses: JSON.stringify(['s1']), settings_types: JSON.stringify(['t1']) };
    const columnsData = [ mockColumn ];
    const tasksData = [{ id: 'task-uuid-1', column_id: mockColumn.id, title: 'Task 1', created_at: new Date(), updated_at: new Date(), due_date: null }];

    it('should return a project with columns, tasks and parsed settings if user is owner', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(projectDataRaw); // Project fetch for ensureUserHasAccess
      mockQueryBuilder.orderBy.mockResolvedValueOnce(columnsData); // Columns fetch
      mockQueryBuilder.orderBy.mockResolvedValueOnce(tasksData); // Tasks fetch

      const result = await service.findProjectById(projectId, mockUser);

      expect(mockKnexClient).toHaveBeenCalledWith('projects');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: projectId });
      expect(mockQueryBuilder.first).toHaveBeenCalledTimes(1);

      expect(mockKnexClient).toHaveBeenCalledWith('columns');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ project_id: projectId });

      expect(mockKnexClient).toHaveBeenCalledWith('tasks');
      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('column_id', [mockColumn.id]);

      expect(result.id).toBe(projectId);
      expect(result.settings_statuses).toEqual(['s1']);
      expect(result.settings_types).toEqual(['t1']);
      expect(result.columns[0].tasks[0].title).toBe('Task 1');
    });

    it('should throw NotFoundException if project not found during access check', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(null); // Project not found in ensureUserHasAccessToProject
      await expect(service.findProjectById(999, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner or member during access check', async () => {
      const otherUser = { ...mockUser, id: 'user-2' };
      mockQueryBuilder.first.mockResolvedValueOnce({ ...projectDataRaw, owner_id: 'another-owner-id' }); // Project found, not owned
      mockQueryBuilder.first.mockResolvedValueOnce(null); // Not a member either

      await expect(service.findProjectById(projectId, otherUser)).rejects.toThrow(ForbiddenException);
    });
  });

  // --- New tests for getProjectSettings and updateProjectSettings ---

  describe('getProjectSettings', () => {
    const projectId = 1;
    const userId = mockUser.id;
    const rawProjectData = {
      id: projectId,
      name: 'Test Project',
      task_prefix: 'TP',
      owner_id: userId,
      settings_statuses: JSON.stringify(['Open', 'Closed']),
      settings_types: JSON.stringify(['Bug', 'Enhancement']),
      created_at: new Date().toISOString(), // ensureUserHasAccessToProject will parse this
      updated_at: new Date().toISOString(),
      last_task_number: 0 // ensure this field exists in mock for ensureUserHasAccessToProject
    };

    it('should return project settings if user has access', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(rawProjectData); // For ensureUserHasAccessToProject

      const result = await service.getProjectSettings(projectId, userId);

      expect(result).toEqual({
        id: projectId,
        name: 'Test Project',
        prefix: 'TP', // Check for 'prefix'
        settings_statuses: ['Open', 'Closed'],
        settings_types: ['Bug', 'Enhancement'],
      });
      expect(mockKnexClient).toHaveBeenCalledWith('projects');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: projectId });
    });

    it('should use default settings if DB values are null', async () => {
        const projectWithNullSettings = { ...rawProjectData, settings_statuses: null, settings_types: null };
        mockQueryBuilder.first.mockResolvedValueOnce(projectWithNullSettings);

        const result = await service.getProjectSettings(projectId, userId);
        expect(result.settings_statuses).toEqual(['To Do', 'In Progress', 'Done']); // Default
        expect(result.settings_types).toEqual(['Task', 'Bug', 'Feature']); // Default
    });

    it('should throw NotFoundException if project not found', async () => {
        mockQueryBuilder.first.mockResolvedValueOnce(null);
        await expect(service.getProjectSettings(projectId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not have access', async () => {
        const otherUserId = 'other-user-id';
        mockQueryBuilder.first.mockResolvedValueOnce({ ...rawProjectData, owner_id: 'someone_else' }); // Project exists
        mockQueryBuilder.first.mockResolvedValueOnce(null); // User is not a member
        await expect(service.getProjectSettings(projectId, otherUserId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateProjectSettings', () => {
    const projectId = 1;
    const ownerId = mockUser.id;
    const initialProjectData = {
      id: projectId,
      name: 'Initial Name',
      task_prefix: 'INIT',
      owner_id: ownerId,
      settings_statuses: JSON.stringify(['s1', 's2']),
      settings_types: JSON.stringify(['t1', 't2']),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_task_number: 0
    };

    const setupMocksForUpdate = (projectDataToReturnOnFirstRead = initialProjectData, updatedProjectData = initialProjectData) => {
        // Mock for ensureUserHasAccessToProject (first read)
        mockTrxQueryBuilder.first.mockResolvedValueOnce(projectDataToReturnOnFirstRead);
        // Mock for the read after update (to return the "updated" record)
        mockTrxQueryBuilder.first.mockResolvedValueOnce(updatedProjectData);
    };

    it('should update project settings successfully and return them', async () => {
      const settingsDto: any = { name: 'Updated Name', prefix: 'UPD', statuses: ['newS1'], types: ['newT1'] };
      const expectedUpdatedData = {
        ...initialProjectData,
        name: settingsDto.name,
        task_prefix: settingsDto.prefix.toUpperCase(),
        settings_statuses: JSON.stringify(settingsDto.statuses),
        settings_types: JSON.stringify(settingsDto.types),
      };
      setupMocksForUpdate(initialProjectData, expectedUpdatedData);
      mockTrxQueryBuilder.update.mockResolvedValueOnce(1); // DB update successful
      mockTrxQueryBuilder.whereNot.mockReturnThis(); // for prefix check
      mockTrxQueryBuilder.first.mockResolvedValueOnce(null); // No conflict for prefix

      const result = await service.updateProjectSettings(projectId, ownerId, settingsDto);

      expect(mockKnexClient.transaction).toHaveBeenCalled();
      expect(mockTrxQueryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name',
        task_prefix: 'UPD',
        settings_statuses: JSON.stringify(['newS1']),
        settings_types: JSON.stringify(['newT1']),
        updated_at: expect.any(Date),
      }));
      expect(result).toEqual({
        id: projectId,
        name: 'Updated Name',
        prefix: 'UPD', // Check for 'prefix'
        settings_statuses: ['newS1'],
        settings_types: ['newT1'],
      });
    });

    it('should call TasksService.updateTaskPrefixesForProject and logger.log if prefix changes', async () => {
        const settingsDto: any = { prefix: 'NEWPREFIX' };
        const numAffectedTasks = 5;
        const updatedProjectData = { ...initialProjectData, task_prefix: 'NEWPREFIX' };
        setupMocksForUpdate(initialProjectData, updatedProjectData);
        mockTrxQueryBuilder.update.mockResolvedValueOnce(1);
        mockTrxQueryBuilder.whereNot.mockReturnThis();
        mockTrxQueryBuilder.first.mockResolvedValueOnce(null); // No conflict for prefix
        mockTasksService.updateTaskPrefixesForProject.mockResolvedValueOnce(numAffectedTasks);

        await service.updateProjectSettings(projectId, ownerId, settingsDto);

        expect(mockTasksService.updateTaskPrefixesForProject).toHaveBeenCalledWith(
            projectId,
            initialProjectData.task_prefix,
            settingsDto.prefix.toUpperCase(),
            expect.any(Function) // Knex transaction object (mocked as a function)
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
            `Task prefixes update for project ${projectId} (from ${initialProjectData.task_prefix} to ${settingsDto.prefix.toUpperCase()}) affected ${numAffectedTasks} tasks.`
        );
    });

    it('should NOT call TasksService.updateTaskPrefixesForProject or logger.log for prefix if prefix does not change', async () => {
        const settingsDto: any = { name: 'Only Name Change' };
        setupMocksForUpdate(initialProjectData, { ...initialProjectData, name: settingsDto.name });
        mockTrxQueryBuilder.update.mockResolvedValueOnce(1);

        await service.updateProjectSettings(projectId, ownerId, settingsDto);
        expect(mockTasksService.updateTaskPrefixesForProject).not.toHaveBeenCalled();
        expect(mockLogger.log).not.toHaveBeenCalledWith(expect.stringContaining('Task prefixes update'));
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
        const nonOwnerId = 'user-non-owner';
        // ensureUserHasAccessToProject would allow access if nonOwnerId is a member,
        // but the service method itself checks project.owner_id === userId
        setupMocksForUpdate({ ...initialProjectData, owner_id: ownerId }); // Project owned by ownerId

        const settingsDto: any = { name: 'Attempted Update' };
        await expect(service.updateProjectSettings(projectId, nonOwnerId, settingsDto))
            .rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if new prefix is already in use', async () => {
        const settingsDto: any = { prefix: 'EXISTING' };
        setupMocksForUpdate(initialProjectData);
        mockTrxQueryBuilder.whereNot.mockReturnThis();
        mockTrxQueryBuilder.first.mockResolvedValueOnce({ id: 2, task_prefix: 'EXISTING' }); // Prefix conflict

        await expect(service.updateProjectSettings(projectId, ownerId, settingsDto))
            .rejects.toThrow(ConflictException);
    });

    it('should return current settings if DTO is empty or only contains non-changeable fields', async () => {
        const settingsDto: any = {}; // Empty DTO
        setupMocksForUpdate(initialProjectData);
        // No call to mockTrxQueryBuilder.update() should happen

        const result = await service.updateProjectSettings(projectId, ownerId, settingsDto);

        expect(mockTrxQueryBuilder.update).not.toHaveBeenCalled();
        expect(result).toEqual({ // Expecting the initial (parsed) settings with 'prefix'
            id: initialProjectData.id,
            name: initialProjectData.name,
            prefix: initialProjectData.task_prefix, // Check for 'prefix'
            settings_statuses: JSON.parse(initialProjectData.settings_statuses),
            settings_types: JSON.parse(initialProjectData.settings_types),
        });
    });

  });

});
