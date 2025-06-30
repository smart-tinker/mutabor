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

// ### ИЗМЕНЕНИЕ: Полный и корректный мок Knex и транзакции ###
const trxMock = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue({ id: 'col-1' }),
    forUpdate: jest.fn().mockReturnThis(),
    increment: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([ { last_task_number: 1, task_prefix: 'TP' } ]),
    count: jest.fn().mockResolvedValue({ count: '0' }),
    insert: jest.fn().mockReturnThis(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (tableName: string) {
        return this;
    },
};
const mockKnex = {
    transaction: jest.fn().mockImplementation(async (callback) => callback(trxMock)),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();
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
      (trxMock.returning as jest.Mock)
        .mockResolvedValueOnce([ { last_task_number: 1, task_prefix: 'TP' } ])
        .mockResolvedValueOnce([mockTask]);

      await service.createTask(1, createTaskDto, mockUser);

      expect(mockKnex.transaction).toHaveBeenCalled();
      expect(trxMock.insert).toHaveBeenCalled();
      expect(mockEventsGateway.emitTaskCreated).toHaveBeenCalledWith(mockTask);
    });
  });
});