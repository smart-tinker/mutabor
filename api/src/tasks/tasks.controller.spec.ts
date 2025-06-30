import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskRecord } from '../types/db-records';
import { AuthenticatedUser } from '../auth/jwt.strategy';

// ### ИЗМЕНЕНИЕ: Добавляем password_hash в мок ###
const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@example.com', name: 'Test User' };
const mockTask: TaskRecord = { id: 'task-1', human_readable_id: 'TP-1', task_number: 1, title: 'Test Task', description: null, position: 0, project_id: 1, column_id: 'col-1', assignee_id: null, creator_id: 'user-1', due_date: null, created_at: new Date(), updated_at: new Date(), type: null, priority: null, tags: null };

const mockTasksService = {
  createTask: jest.fn().mockResolvedValue(mockTask),
  findTaskById: jest.fn().mockResolvedValue(mockTask),
  findTaskByHumanId: jest.fn().mockResolvedValue(mockTask),
  updateTask: jest.fn().mockResolvedValue(mockTask),
  moveTask: jest.fn().mockResolvedValue(mockTask),
  addCommentToTask: jest.fn(),
  getCommentsForTask: jest.fn(),
};

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: mockTasksService }],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: (context) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockUser;
        return true;
      } 
    })
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
      const createDto = { title: 'New Task', columnId: 'col-1' };
      // ### ИЗМЕНЕНИЕ: Передаем projectId как параметр, а не в DTO ###
      await controller.create(1, createDto, mockReq);
      expect(service.createTask).toHaveBeenCalledWith(1, createDto, mockUser);
    });
  });

  describe('findOne', () => {
    it('should call service.findTaskById with UUID and return a task', async () => {
      // ### ИЗМЕНЕНИЕ: Убираем лишний аргумент mockReq ###
      await controller.findOne(mockTask.id);
      expect(service.findTaskById).toHaveBeenCalledWith(mockTask.id);
    });
  });

  describe('findOneByHid', () => {
    it('should call service.findTaskByHumanId and return a task', async () => {
      // ### ИЗМЕНЕНИЕ: Убираем лишний аргумент mockReq ###
      await controller.findOneByHid(mockTask.human_readable_id);
      expect(service.findTaskByHumanId).toHaveBeenCalledWith(mockTask.human_readable_id);
    });
  });
  
  describe('update', () => {
    it('should call service.updateTask and return a task', async () => {
      const updateDto = { title: 'Updated Task' };
      await controller.update(mockTask.id, updateDto, mockReq);
      expect(service.updateTask).toHaveBeenCalledWith(mockTask.id, updateDto, mockUser);
    });
  });

  describe('move', () => {
    it('should call service.moveTask and return a task', async () => {
      const moveDto = { newColumnId: 'col-2', newPosition: 0 };
      await controller.move(mockTask.id, moveDto, mockReq);
      expect(service.moveTask).toHaveBeenCalledWith(mockTask.id, moveDto, mockUser);
    });
  });
});