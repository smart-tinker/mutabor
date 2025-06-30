import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { EventsGateway } from '../events/events.gateway';
import { CommentsService } from '../comments/comments.service';
import { ProjectsService } from '../projects/projects.service';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { TaskRecord } from '../types/db-records';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { Logger } from '@nestjs/common';

const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@example.com', name: 'Test User' };
const mockTask: TaskRecord = { id: 'task-1', human_readable_id: 'TP-1', task_number: 1, title: 'Test Task', position: 0, project_id: 1, column_id: 'col-1', creator_id: 'user-1', description: null, assignee_id: null, due_date: null, type: null, priority: null, tags: null, created_at: new Date(), updated_at: new Date() };

const mockProjectsService = {
  getProjectAndRole: jest.fn().mockResolvedValue({ project: { id: 1 }, userRole: 'owner' }),
  isTaskTypeValidForProject: jest.fn().mockResolvedValue(true),
};
const mockEventsGateway = { emitTaskCreated: jest.fn() };
const mockCommentsService = { createComment: jest.fn() };
const mockNotificationsService = { createMentionNotifications: jest.fn() };

// ### ИЗМЕНЕНИЕ: Более надежный и предсказуемый мок
const trxMockInner = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn(), // Мокируем его отдельно
    forUpdate: jest.fn().mockReturnThis(),
    increment: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    insert: jest.fn().mockReturnThis(),
};

const trxMock = jest.fn(() => trxMockInner);

const mockKnex = jest.fn(() => ({})) as jest.Mock & { transaction: jest.Mock };
mockKnex.transaction = jest.fn().mockImplementation(async (callback) => callback(trxMock));


describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // ### ИЗМЕНЕНИЕ: Сбрасываем моки перед каждым тестом для изоляции
    (trxMockInner.first as jest.Mock)
      .mockResolvedValueOnce({ id: 'col-1' }) // Для поиска колонки
      .mockResolvedValueOnce({ count: '0' }); // Для результата count

    (trxMockInner.returning as jest.Mock)
      .mockResolvedValueOnce([ { last_task_number: 1, task_prefix: 'TP' } ]) // Для project
      .mockResolvedValueOnce([mockTask]); // для task

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: KNEX_CONNECTION, useValue: mockKnex },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: CommentsService, useValue: mockCommentsService },
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        Logger,
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTask', () => {
    it('should successfully create a task', async () => {
      const createTaskDto = { title: 'New Task', columnId: 'col-1' };

      await service.createTask(1, createTaskDto, mockUser);

      expect(mockKnex.transaction).toHaveBeenCalled();
      expect(trxMock).toHaveBeenCalledWith('columns'); // Проверяем вызовы
      expect(trxMock).toHaveBeenCalledWith('projects');
      expect(trxMock).toHaveBeenCalledWith('tasks');
      expect(trxMockInner.insert).toHaveBeenCalledTimes(1); 
      expect(mockEventsGateway.emitTaskCreated).toHaveBeenCalledWith(mockTask);
    });
  });
});