import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { NotFoundException } from '@nestjs/common';
import { User, Comment as PrismaComment, Task } from '@prisma/client';

describe('CommentsService', () => {
  let service: CommentsService;
  let prismaMock: {
    task: { findUnique: jest.Mock };
    comment: { create: jest.Mock; findMany: jest.Mock };
    user: { findMany: jest.Mock };
    projectMember: { findUnique: jest.Mock };
    project: { findFirst: jest.Mock };
  };
  let notificationsServiceMock: { createNotification: jest.Mock };
  let eventsGatewayMock: { emitCommentCreated: jest.Mock };

  const mockUser: User = { id: 'user1', email: 'user1@example.com', name: 'User One', password: 'hashedpassword', createdAt: new Date(), updatedAt: new Date() };
  const mockTask: Task = { id: 'task1', projectId: 1, title: 'Test Task', columnId: 'col1', creatorId: 'userCreator', humanReadableId: 'T1', position:0, taskNumber:1, createdAt: new Date(), updatedAt: new Date(), description: null, dueDate: null, assigneeId: null };
  const mockCommentWithAuthor: PrismaComment & { author: User | null } = {
    id: 'comment1',
    text: 'Test comment @UserTwo',
    taskId: 'task1',
    authorId: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockUser
  };

  beforeEach(async () => {
    prismaMock = {
      task: { findUnique: jest.fn() },
      comment: { create: jest.fn(), findMany: jest.fn() },
      user: { findMany: jest.fn() },
      projectMember: { findUnique: jest.fn() },
      project: { findFirst: jest.fn() },
    };
    notificationsServiceMock = { createNotification: jest.fn() };
    eventsGatewayMock = { emitCommentCreated: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsServiceMock },
        { provide: EventsGateway, useValue: eventsGatewayMock },
      ],
    }).compile();
    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a comment, handle mentions, and emit an event', async () => {
      prismaMock.task.findUnique.mockResolvedValue({ ...mockTask, projectId: 1, title: "Task Title" });
      prismaMock.comment.create.mockResolvedValue(mockCommentWithAuthor);

      const mentionedUser: User = { id: 'user2', name: 'UserTwo', email: 'user2@example.com', password: 'pw', createdAt: new Date(), updatedAt: new Date() };
      prismaMock.user.findMany.mockResolvedValue([mentionedUser]); // Mock for @mention user lookup
      prismaMock.projectMember.findUnique.mockResolvedValue({ userId: 'user2', projectId: 1, role: 'editor' }); // Mock mentioned user is member
      prismaMock.project.findFirst.mockResolvedValue({ id: 1, ownerId: 'owner', name: 'Proj', taskPrefix: 'P', lastTaskNumber: 1, createdAt: new Date(), updatedAt: new Date() });


      const dto = { text: 'Test comment @UserTwo' };
      const result = await service.createComment('task1', dto, 'user1');

      expect(result.text).toBe(dto.text);
      expect(prismaMock.comment.create).toHaveBeenCalled();
      expect(eventsGatewayMock.emitCommentCreated).toHaveBeenCalledWith(mockCommentWithAuthor, 1);
      expect(notificationsServiceMock.createNotification).toHaveBeenCalled();
    });

    it('should throw NotFoundException if task not found', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);
      const dto = { text: 'Test comment' };
      await expect(service.createComment('task-unknown', dto, 'user1')).rejects.toThrow(NotFoundException);
    });

    it('should not call notification service if no users are mentioned', async () => {
      prismaMock.task.findUnique.mockResolvedValue({ ...mockTask, projectId: 1, title: "Task Title" });
      prismaMock.comment.create.mockResolvedValue(mockCommentWithAuthor);
      prismaMock.user.findMany.mockResolvedValue([]); // No users found for mentions

      const dto = { text: 'Test comment with no mentions' };
      await service.createComment('task1', dto, 'user1');

      expect(notificationsServiceMock.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('getCommentsForTask', () => {
    it('should return comments for a task', async () => {
      prismaMock.task.findUnique.mockResolvedValue(mockTask);
      prismaMock.comment.findMany.mockResolvedValue([mockCommentWithAuthor]);
      const comments = await service.getCommentsForTask('task1');
      expect(comments).toEqual([mockCommentWithAuthor]);
      expect(prismaMock.comment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { taskId: 'task1' } }));
    });

    it('should throw NotFoundException if task not found for getComments', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);
      await expect(service.getCommentsForTask('task-unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
