import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { EventsGateway } from '../events/events.gateway';
import { NotFoundException } from '@nestjs/common';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { UserRecord } from 'src/types/db-records';

const mockKnex = {
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([{ id: 'comment-uuid', text: 'Test comment', task_id: 'task1', author_id: 'user1' }]),
  orderBy: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
};

const knexProvider = {
  provide: KNEX_CONNECTION,
  useValue: jest.fn().mockReturnValue(mockKnex),
};

describe('CommentsService', () => {
  let service: CommentsService;
  const eventsGatewayMock = { emitCommentCreated: jest.fn() };

  // ### ИЗМЕНЕНИЕ: Добавлено поле role ###
  const mockUser: UserRecord = { id: 'user1', name: 'User One', email: 'user1@example.com', password_hash: 'hash', role: 'user', created_at: new Date(), updated_at: new Date() };
  const mockTaskData = { id: 'task1', project_id: 1 };
  
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        knexProvider,
        { provide: EventsGateway, useValue: eventsGatewayMock },
      ],
    }).compile();
    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a comment and emit an event', async () => {
      mockKnex.first.mockResolvedValueOnce(mockTaskData);
      mockKnex.first.mockResolvedValueOnce(mockUser);

      const dto = { text: 'Test comment' };
      const result = await service.createComment('task1', dto, 'user1');

      expect(result.text).toBe(dto.text);
      expect(eventsGatewayMock.emitCommentCreated).toHaveBeenCalled();
    });

    it('should throw NotFoundException if task not found', async () => {
      mockKnex.first.mockResolvedValueOnce(null);
      const dto = { text: 'Test comment' };
      await expect(service.createComment('task-unknown', dto, 'user1')).rejects.toThrow(NotFoundException);
    });
  });
});