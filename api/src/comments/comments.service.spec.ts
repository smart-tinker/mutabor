import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { NotFoundException } from '@nestjs/common';
import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined

// Mock Knex
const mockKnexChainable = { // Renamed for clarity: this is the object with chainable methods
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis(), // Added count
  // then: jest.fn(), // Removed: Not standard to mock 'then' directly on the builder instance
  whereIn: jest.fn().mockReturnThis(),
  andWhereNot: jest.fn().mockReturnThis(),
};

const knexProvider = {
  provide: KNEX_CONNECTION,
  // This is the main knex function, e.g. this.knex('users')
  // It needs to be a jest.fn() that returns our chainable methods mock
  useValue: jest.fn().mockReturnValue(mockKnexChainable),
};


describe('CommentsService', () => {
  let service: CommentsService;
  // Initialize mocks at declaration to prevent 'cannot read property of undefined'
  const notificationsServiceMock = { createNotification: jest.fn() };
  const eventsGatewayMock = { emitCommentCreated: jest.fn() };
  let knexFn: jest.Mock;


  const mockUser = { id: 'user1', name: 'User One', email: 'user1@example.com' };
  const mockTaskData = { project_id: 1, title: 'Test Task' };
  const mockCommentData = {
    id: 'generated-comment-uuid', // Assuming crypto.randomUUID()
    text: 'Test comment @UserTwo',
    task_id: 'task1',
    author_id: 'user1',
    created_at: expect.any(Date), // Will be new Date()
    updated_at: expect.any(Date), // Will be new Date()
    author: mockUser,
  };

  beforeEach(async () => {
    notificationsServiceMock.createNotification.mockClear();
    eventsGatewayMock.emitCommentCreated.mockClear();

    jest.clearAllMocks(); // Clears call counts, etc. for all mocks

    // Explicitly re-assign/reset all known methods on mockKnexChainable
    mockKnexChainable.where = jest.fn().mockReturnThis();
    mockKnexChainable.select = jest.fn().mockReturnThis(); // Default to chainable
    mockKnexChainable.first = jest.fn(); // Terminal: tests set mockResolvedValueOnce
    mockKnexChainable.insert = jest.fn().mockReturnThis();
    mockKnexChainable.join = jest.fn().mockReturnThis();
    mockKnexChainable.orderBy = jest.fn(); // Terminal: tests set mockResolvedValueOnce
    mockKnexChainable.whereIn = jest.fn().mockReturnThis();
    mockKnexChainable.andWhereNot = jest.fn().mockReturnThis();
    // mockKnexChainable.count is not used directly by CommentsService on the main chainable object.
    // If it were, it'd be: mockKnexChainable.count = jest.fn(); (and then tests mock its specific resolution)


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        knexProvider,
        { provide: NotificationsService, useValue: notificationsServiceMock },
        { provide: EventsGateway, useValue: eventsGatewayMock },
      ],
    }).compile();
    service = module.get<CommentsService>(CommentsService);
    knexFn = module.get(KNEX_CONNECTION);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a comment, handle mentions, and emit an event', async () => {
      mockKnexChainable.first.mockResolvedValueOnce(mockTaskData); // For taskData
      mockKnexChainable.first.mockResolvedValueOnce(mockUser); // For author
      // For handleMentions
      const mentionedUser = { id: 'user2', name: 'UserTwo', email: 'user2@example.com' };
      // For usersToNotify: knex('users').whereIn(...).andWhereNot(...).select(...)
      mockKnexChainable.select.mockResolvedValueOnce([mentionedUser]); // Mock the end of this chain part

      // For isProjectMember: knex('project_members').where(...).first()
      mockKnexChainable.first.mockResolvedValueOnce({ project_id: 1, user_id: 'user2' });
      // For isProjectOwner: knex('projects').where(...).first()
      mockKnexChainable.first.mockResolvedValueOnce(null);


      const dto = { text: 'Test comment @UserTwo' };
      const result = await service.createComment('task1', dto, 'user1');

      expect(result.text).toBe(dto.text);
      expect(knexFn).toHaveBeenCalledWith('tasks');
      expect(mockKnexChainable.where).toHaveBeenCalledWith({ id: 'task1' });
      expect(mockKnexChainable.select).toHaveBeenCalledWith('project_id', 'title');

      // Order of first() calls: taskData, author, isProjectMember, isProjectOwner
      // Total 4 calls to first() expected in this test case.
      // Note: Calls to first() for isProjectMember and isProjectOwner are part of handleMentions,
      // which is called AFTER the main comment creation. So, at this point in the main function flow,
      // we'd expect 2 calls (taskData, author). The others are chained inside handleMentions.
      // The previous assertion of 4 was likely overcounting for the direct createComment logic.
      // Let's adjust based on what's directly in createComment before handleMentions.
      // It's 1 for taskData, 1 for author. So 2.
      // The handleMentions calls to first() will be separate.
      // This needs careful sequencing of mockResolvedValueOnce for 'first'.
      // Re-evaluating:
      // 1. createComment: taskData = first()
      // 2. createComment: author = first()
      // 3. handleMentions: isProjectMember = first()
      // 4. handleMentions: isProjectOwner = first()
      // So, if all paths are hit, 4 is correct. The mocks need to be sequenced correctly.
      expect(mockKnexChainable.first).toHaveBeenCalledTimes(4);

      expect(knexFn).toHaveBeenCalledWith('comments');
      expect(mockKnexChainable.insert).toHaveBeenCalledWith(expect.objectContaining({
        text: dto.text,
        task_id: 'task1',
        author_id: 'user1',
      }));
      expect(eventsGatewayMock.emitCommentCreated).toHaveBeenCalledWith(expect.objectContaining(mockCommentData), mockTaskData.project_id);
      expect(notificationsServiceMock.createNotification).toHaveBeenCalled();
    });

    it('should throw NotFoundException if task not found', async () => {
      mockKnexChainable.first.mockResolvedValueOnce(null); // taskData is null
      const dto = { text: 'Test comment' };
      await expect(service.createComment('task-unknown', dto, 'user1')).rejects.toThrow(NotFoundException);
    });

    it('should not call notification service if no users are mentioned', async () => {
      mockKnexChainable.first.mockResolvedValueOnce(mockTaskData); // taskData
      mockKnexChainable.first.mockResolvedValueOnce(mockUser);   // author
      // For handleMentions - no users found for mentions
      // For usersToNotify: knex('users').whereIn(...).andWhereNot(...).select(...)
      mockKnexChainable.select.mockResolvedValueOnce([]); // No users found

      const dto = { text: 'Test comment with no mentions' }; // No @mentions
      await service.createComment('task1', dto, 'user1');

      expect(notificationsServiceMock.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('getCommentsForTask', () => {
    const commentsFromDb = [{ // This should reflect raw DB column names
        id: 'comment1', text: 'Comment 1', created_at: new Date(), updated_at: new Date(), // Use updated_at
        author_id: 'user1', author_name: 'User One', author_email: 'user1@example.com'
    }];
    const expectedComments = [{ // This reflects the mapped structure returned by the service
        id: 'comment1', text: 'Comment 1', createdAt: commentsFromDb[0].created_at, updatedAt: commentsFromDb[0].updated_at,
        author: { id: 'user1', name: 'User One', email: 'user1@example.com' }
    }];

    it('should return comments for a task', async () => {
      mockKnexChainable.first.mockResolvedValueOnce({ id: 'task1' }); // taskExists
      mockKnexChainable.orderBy.mockResolvedValueOnce(commentsFromDb); // orderBy is terminal here


      const comments = await service.getCommentsForTask('task1');

      expect(comments).toEqual(expectedComments);
      expect(knexFn).toHaveBeenCalledWith('tasks');
      expect(mockKnexChainable.where).toHaveBeenCalledWith({ id: 'task1' }); // For taskExists
      expect(knexFn).toHaveBeenCalledWith('comments');
      expect(mockKnexChainable.join).toHaveBeenCalledWith('users', 'comments.author_id', '=', 'users.id');
      expect(mockKnexChainable.where).toHaveBeenCalledWith({ 'comments.task_id': 'task1' });
      expect(mockKnexChainable.orderBy).toHaveBeenCalledWith('comments.created_at', 'asc');
    });

    it('should throw NotFoundException if task not found for getComments', async () => {
      mockKnexChainable.first.mockResolvedValueOnce(null); // taskExists is null
      await expect(service.getCommentsForTask('task-unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
