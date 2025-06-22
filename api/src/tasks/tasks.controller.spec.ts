import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const mockUser: any /* User */ = { id: 'user-1', email: 'test@example.com', name: 'Test User', password: 'pwd', createdAt: new Date(), updatedAt: new Date() };
const mockTask: any /* Task */ = { id: 'task-1', humanReadableId: 'TP-1', taskNumber: 1, title: 'Test Task', description: null, position: 0, projectId: 1, columnId: 'col-1', assigneeId: null, creatorId: 'user-1', dueDate: null, createdAt: new Date(), updatedAt: new Date() };

// Mock TasksService
const mockTasksService = {
  createTask: jest.fn().mockResolvedValue(mockTask),
  findTaskById: jest.fn().mockResolvedValue(mockTask),
  updateTask: jest.fn().mockResolvedValue(mockTask),
  moveTask: jest.fn().mockResolvedValue(mockTask),
};

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: jest.fn(() => true) })
    .compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const mockReq = { user: mockUser };

  describe('create', () => {
    it('should call service.createTask and return a task', async () => {
      const createDto = { title: 'New Task', columnId: 'col-1', projectId: 1 };
      const result = await controller.create(createDto, mockReq);
      expect(service.createTask).toHaveBeenCalledWith(createDto, mockUser);
      expect(result).toEqual(mockTask);
    });
  });

  describe('findOne', () => {
    it('should call service.findTaskById and return a task', async () => {
      const result = await controller.findOne(mockTask.id, mockReq);
      expect(service.findTaskById).toHaveBeenCalledWith(mockTask.id, mockUser);
      expect(result).toEqual(mockTask);
    });
  });

  describe('update', () => {
    it('should call service.updateTask and return a task', async () => {
      const updateDto = { title: 'Updated Task' };
      const result = await controller.update(mockTask.id, updateDto, mockReq);
      expect(service.updateTask).toHaveBeenCalledWith(mockTask.id, updateDto, mockUser);
      expect(result).toEqual(mockTask);
    });
  });

  describe('move', () => {
    it('should call service.moveTask and return a task', async () => {
      const moveDto = { newColumnId: 'col-2', newPosition: 0 };
      const result = await controller.move(mockTask.id, moveDto, mockReq);
      expect(service.moveTask).toHaveBeenCalledWith(mockTask.id, moveDto, mockUser);
      expect(result).toEqual(mockTask);
    });
  });
});
