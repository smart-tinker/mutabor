import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { EventsGateway } from '../events/events.gateway';
import { CommentsService } from '../comments/comments.service';
import { ProjectsService } from '../projects/projects.service';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { TaskRecord } from '../types/db-records';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { Logger, BadRequestException, NotFoundException } from '@nestjs/common';

const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'user' };

describe('TasksService', () => {
  let service: TasksService;
  let knex;
  let mockProjectsService: ProjectsService;
  let mockEventsGateway: EventsGateway;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    select: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnValue({
      first: jest.fn(),
    }),
    forUpdate: jest.fn().mockReturnThis(),
    increment: jest.fn().mockReturnThis(),
    decrement: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  };

  const mockKnexFn = jest.fn(() => mockQueryBuilder);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        Logger,
        {
          provide: KNEX_CONNECTION,
          useValue: Object.assign(mockKnexFn, {
            transaction: jest.fn().mockImplementation(async (callback) => callback(mockKnexFn)),
          }),
        },
        {
          provide: EventsGateway,
          useValue: { emitTaskCreated: jest.fn(), emitTaskUpdated: jest.fn(), emitTaskMoved: jest.fn() },
        },
        {
          provide: CommentsService,
          useValue: { createComment: jest.fn() },
        },
        {
          provide: ProjectsService,
          useValue: { 
            isTaskTypeValidForProject: jest.fn().mockResolvedValue(true),
            getUserRoleForProject: jest.fn().mockResolvedValue('owner'),
          },
        },
        {
          provide: NotificationsService,
          useValue: { createMentionNotifications: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    knex = module.get(KNEX_CONNECTION);
    // ### ИЗМЕНЕНИЕ: Исправлено получение мока сервиса ###
    mockProjectsService = module.get<ProjectsService>(ProjectsService);
    mockEventsGateway = module.get<EventsGateway>(EventsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProjectIdByHumanId', () => {
    it('should return project ID for a given human-readable ID', async () => {
      const hid = 'TP-1';
      const expectedProjectId = 123;
      mockQueryBuilder.first.mockResolvedValue({ project_id: expectedProjectId });
  
      const projectId = await service.getProjectIdByHumanId(hid);
  
      expect(projectId).toBe(expectedProjectId);
      expect(mockKnexFn).toHaveBeenCalledWith('tasks');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ human_readable_id: hid });
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('project_id');
    });
  
    it('should throw NotFoundException if task with HID is not found', async () => {
      const hid = 'TP-999';
      mockQueryBuilder.first.mockResolvedValue(null);
  
      await expect(service.getProjectIdByHumanId(hid)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTask', () => {
    const projectId = 1;
    const createTaskDto = { title: 'New Task', columnId: 'col-1' };
    const mockColumn = { id: 'col-1', project_id: projectId };
    const mockProject = { last_task_number: 1, task_prefix: 'TP' };
    const mockTask: Partial<TaskRecord> = { id: 'task-1', title: 'New Task' };

    it('should create a task successfully', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(mockColumn);
      mockQueryBuilder.count().first.mockResolvedValueOnce({ count: '5' });
      mockQueryBuilder.returning.mockResolvedValueOnce([mockProject]);
      mockQueryBuilder.returning.mockResolvedValueOnce([mockTask]);

      const result = await service.createTask(projectId, createTaskDto, mockUser);
      
      expect(result).toEqual(mockTask);
      expect(mockEventsGateway.emitTaskCreated).toHaveBeenCalledWith(mockTask);
      expect(mockQueryBuilder.increment).toHaveBeenCalledWith('last_task_number', 1);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
        human_readable_id: `${mockProject.task_prefix}-${mockProject.last_task_number}`,
        position: 5,
        creator_id: mockUser.id,
      }));
    });

    it('should throw BadRequestException if column does not exist', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);
      await expect(service.createTask(projectId, createTaskDto, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if task type is invalid', async () => {
      (mockProjectsService.isTaskTypeValidForProject as jest.Mock).mockResolvedValue(false);
      mockQueryBuilder.first.mockResolvedValueOnce(mockColumn);
      const dtoWithInvalidType = { ...createTaskDto, type: 'InvalidType' };
      await expect(service.createTask(projectId, dtoWithInvalidType, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTask', () => {
    const taskId = 'task-uuid';
    const updateDto = { title: 'Updated Title' };
    const mockTask = { id: taskId, project_id: 1, title: 'Old Title' };
    const updatedMockTask = { ...mockTask, ...updateDto };

    it('should update a task successfully', async () => {
      mockQueryBuilder.first.mockResolvedValue(mockTask);
      mockQueryBuilder.returning.mockResolvedValue([updatedMockTask]);

      const result = await service.updateTask(taskId, updateDto, mockUser);

      expect(result).toEqual(updatedMockTask);
      expect(knex.transaction).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Title' }));
      expect(mockEventsGateway.emitTaskUpdated).toHaveBeenCalledWith(updatedMockTask);
    });
    
    it('should throw NotFoundException if task does not exist', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        await expect(service.updateTask(taskId, updateDto, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('moveTask', () => {
    const taskId = 'task-uuid';
    const moveDto = { newColumnId: 'col-2', newPosition: 0 };
    const taskToMove = { id: taskId, project_id: 1, column_id: 'col-1', position: 2 };
    
    it('should move a task and reorder positions', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce(taskToMove)
        .mockResolvedValueOnce({ id: 'col-2', project_id: 1 })
        .mockResolvedValueOnce(taskToMove);
        
      mockQueryBuilder.decrement.mockResolvedValue(1);
      mockQueryBuilder.increment.mockResolvedValue(1);
      
      const finalMovedTask = { 
        ...taskToMove, 
        column_id: moveDto.newColumnId,
        position: moveDto.newPosition,
      };
      mockQueryBuilder.returning.mockResolvedValue([finalMovedTask]);

      const result = await service.moveTask(taskId, moveDto, mockUser);

      expect(knex.transaction).toHaveBeenCalled();
      expect(mockQueryBuilder.decrement).toHaveBeenCalledWith('position');
      expect(mockQueryBuilder.increment).toHaveBeenCalledWith('position');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
        column_id: moveDto.newColumnId,
        position: moveDto.newPosition,
      }));
      expect(mockEventsGateway.emitTaskMoved).toHaveBeenCalled();
      expect(result.column_id).toBe('col-2');
    });
  });
});