import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { User, Project, Column, Task } from '@prisma/client';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

// Mocks
const mockPrismaService = {
  project: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  task: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  column: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(async (callback) => callback(mockPrismaService)), // Mock transaction
};

const mockEventsGateway = {
  emitTaskCreated: jest.fn(),
  emitTaskUpdated: jest.fn(),
  emitTaskMoved: jest.fn(),
};

const mockUser: User = { id: 'user-1', email: 'test@example.com', name: 'Test User', password: 'pwd', createdAt: new Date(), updatedAt: new Date() };
const mockProject: Project & { columns?: Column[] } = { id: 1, name: 'Test Project', taskPrefix: 'TP', lastTaskNumber: 0, ownerId: 'user-1', createdAt: new Date(), updatedAt: new Date() };
const mockColumn1: Column = { id: 'col-1', name: 'To Do', position: 0, projectId: 1, createdAt: new Date(), updatedAt: new Date() };
mockProject.columns = [mockColumn1];
const mockTask: Task = { id: 'task-1', humanReadableId: 'TP-1', taskNumber: 1, title: 'Test Task', description: null, position: 0, projectId: 1, columnId: 'col-1', assigneeId: null, creatorId: 'user-1', dueDate: null, createdAt: new Date(), updatedAt: new Date() };


describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaService;
  let eventsGateway: EventsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
    eventsGateway = module.get<EventsGateway>(EventsGateway);
    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTask', () => {
    const createTaskDto = { title: 'New Task', columnId: 'col-1', projectId: 1 };
    it('should create a task and emit event', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.project.update.mockResolvedValue({ ...mockProject, lastTaskNumber: 1 });
      mockPrismaService.task.count.mockResolvedValue(0); // First task in column
      mockPrismaService.task.create.mockResolvedValue({ ...mockTask, title: 'New Task' });

      const result = await service.createTask(createTaskDto, mockUser);

      expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: createTaskDto.projectId }, include: { columns: { where: { id: createTaskDto.columnId } } } });
      expect(prisma.project.update).toHaveBeenCalled();
      expect(prisma.task.create).toHaveBeenCalled();
      expect(eventsGateway.emitTaskCreated).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Task' }));
      expect(result.title).toBe('New Task');
    });
    // Add more tests for error cases: project not found, column not found, user not owner
  });

  describe('updateTask', () => {
    const updateTaskDto = { title: "Updated Title" };
    it('should update a task and emit event', async () => {
        mockPrismaService.task.findUnique.mockResolvedValue(mockTask); // for findTaskById
        mockPrismaService.project.findUnique.mockResolvedValue(mockProject); // for findTaskById's project check
        mockPrismaService.task.update.mockResolvedValue({...mockTask, ...updateTaskDto});

        const result = await service.updateTask(mockTask.id, updateTaskDto, mockUser);
        expect(prisma.task.update).toHaveBeenCalledWith({where: {id: mockTask.id}, data: updateTaskDto});
        expect(eventsGateway.emitTaskUpdated).toHaveBeenCalledWith(result);
        expect(result.title).toBe("Updated Title");
    });
     it('should throw BadRequestException if trying to change columnId', async () => {
        mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
        mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
        await expect(service.updateTask(mockTask.id, { columnId: 'another-col-id' }, mockUser))
            .rejects.toThrow(BadRequestException);
    });
  });

  describe('moveTask', () => {
    const moveTaskDto = { newColumnId: 'col-2', newPosition: 0 };
    const mockColumn2: Column = { id: 'col-2', name: 'In Progress', position: 1, projectId: 1, createdAt: new Date(), updatedAt: new Date() };

    it('should move a task and emit event', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask); // Task to move
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject); // Project access check
      mockPrismaService.column.findUnique.mockResolvedValue(mockColumn2); // Target column

      // Mock transaction steps
      mockPrismaService.task.updateMany.mockResolvedValue({ count: 1 }); // Mocks for position updates
      mockPrismaService.task.update.mockResolvedValue({ ...mockTask, columnId: moveTaskDto.newColumnId, position: moveTaskDto.newPosition }); // Mock the final update of the task

      // Mock refetch after transaction for the return value
      mockPrismaService.task.findUnique.mockResolvedValueOnce(mockTask) // initial find
                                         .mockResolvedValueOnce({ ...mockTask, columnId: moveTaskDto.newColumnId, position: moveTaskDto.newPosition }); // find after move for emit/return

      const result = await service.moveTask(mockTask.id, moveTaskDto, mockUser);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventsGateway.emitTaskMoved).toHaveBeenCalled();
      expect(result.columnId).toBe(moveTaskDto.newColumnId);
      expect(result.position).toBe(moveTaskDto.newPosition);
    });
    // Add more tests for error cases: task not found, target column not found, permission denied
  });
});
