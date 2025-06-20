import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto'; // Correct path
import { NotificationsService } from '../notifications/notifications.service'; // Import NotificationsService
import { Comment, User } from '@prisma/client'; // Import Comment for type usage
import { EventsGateway } from '../events/events.gateway'; // Import EventsGateway

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationsService, // Inject NotificationsService
    private eventsGateway: EventsGateway, // Inject EventsGateway
  ) {}

  async createComment(taskId: string, dto: CreateCommentDto, authorId: string) {
    // Fetch task details needed for mentions and to ensure it exists
    const taskData = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true, title: true }
    });

    if (!taskData) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    const comment = await this.prisma.comment.create({
      data: {
        text: dto.text,
        taskId: taskId,
        authorId: authorId,
      },
      include: { // Include full author object
        author: true
      }
    });

    if (comment) {
      // Ensure comment.author is populated if needed by handleMentions, which it is.
      // The include above should make comment.author.name available.
      this.handleMentions(comment as Comment & { author: User }, taskData.title, authorId, taskData.projectId);
      this.eventsGateway.emitCommentCreated(comment, taskData.projectId); // Emit event
    }

    return comment;
  }

  async getCommentsForTask(taskId: string) {
    const taskData = await this.prisma.task.findUnique({ where: { id: taskId } }); // Renamed for clarity
    if (!taskData) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }
    return this.prisma.comment.findMany({
      where: { taskId: taskId },
      include: {
        author: true, // Include full author object
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Placeholder for mention handling logic
  private async handleMentions(comment: Comment & { author: User }, taskTitle: string, commentAuthorId: string, projectId: number) {
    const regex = /@([a-zA-Z0-9_.-]+)/g; // Assuming mention by name-like identifier
    const mentionedNames = new Set<string>();
    let match;

    // Ensure comment.text is not null or undefined before calling exec
    const textToParse = comment.text || '';
    while ((match = regex.exec(textToParse)) !== null) {
      mentionedNames.add(match[1]);
    }

    if (mentionedNames.size === 0) return;

    const usersToNotify = await this.prisma.user.findMany({
      where: {
        name: { in: Array.from(mentionedNames) }, // Find by name
        id: { not: commentAuthorId }, // Don't notify the author
      },
    });

    const sourceUrl = `/projects/${projectId}/tasks/${comment.taskId}`;

    // comment.author should be populated from the include in createComment
    // Type assertion used when calling handleMentions to ensure author is present
    const authorName = comment.author?.name || 'Someone';
    const finalNotificationText = `You were mentioned by ${authorName} in a comment on task "${taskTitle}": "${textToParse.substring(0, 50)}..."`;

    for (const user of usersToNotify) {
      // Check if user is part of the project before notifying
      const isProjectMember = await this.prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: projectId, userId: user.id } }
      });
      const isProjectOwner = await this.prisma.project.findFirst({ where: { id: projectId, ownerId: user.id }});

      // Notify the mentioned user if they are a member or the owner of the project
      if (isProjectMember || isProjectOwner) {
           await this.notificationService.createNotification(
              user.id,
              finalNotificationText,
              sourceUrl,
              comment.taskId,
           );
      }
    }
  }
}
