// Полный путь: mutabor/api/src/tasks/tasks.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User } from '@prisma/client'; // <-- ВОТ ИСПРАВЛЕНИЕ: Добавлен импорт

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto) {
    const { title, description, columnId, assigneeId } = createTaskDto;

    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
    });
    if (!column) {
      throw new NotFoundException(`Колонка с ID "${columnId}" не найдена`);
    }
    const { projectId } = column;

    return this.prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: { lastTaskNumber: { increment: 1 } },
      });
      const newTaskNumber = updatedProject.lastTaskNumber;
      const taskPrefix = updatedProject.taskPrefix;

      const taskCountInColumn = await tx.task.count({ where: { columnId } });

      return tx.task.create({
        data: {
          title,
          description,
          position: taskCountInColumn,
          columnId,
          assigneeId,
          projectId,
          taskNumber: newTaskNumber,
          humanReadableId: `${taskPrefix}-${newTaskNumber}`,
        },
      });
    });
  }

  async findOneByHumanId(humanId: string) {
    const task = await this.prisma.task.findUnique({
      where: { humanReadableId: humanId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID "${humanId}" не найдена`);
    }
    return task;
  }

  async move(taskId: string, moveTaskDto: MoveTaskDto) {
    const { newColumnId, newPosition } = moveTaskDto;

    return this.prisma.$transaction(async (tx) => {
      const taskToMove = await tx.task.findUnique({ where: { id: taskId } });
      if (!taskToMove) {
        throw new NotFoundException(`Задача с ID "${taskId}" не найдена`);
      }
      const { columnId: oldColumnId, position: oldPosition } = taskToMove;

      const taskCountInNewColumn = await tx.task.count({
        where: { columnId: newColumnId },
      });

      const targetCount =
        oldColumnId === newColumnId
          ? taskCountInNewColumn
          : taskCountInNewColumn + 1;

      if (newPosition >= targetCount) {
        throw new BadRequestException(
          `Некорректная позиция: ${newPosition}. Максимально возможная позиция: ${
            targetCount - 1
          }`,
        );
      }

      if (oldColumnId === newColumnId) {
        if (oldPosition === newPosition) return;

        if (oldPosition < newPosition) {
          await tx.task.updateMany({
            where: {
              columnId: oldColumnId,
              position: { gt: oldPosition, lte: newPosition },
            },
            data: { position: { decrement: 1 } },
          });
        } else {
          await tx.task.updateMany({
            where: {
              columnId: oldColumnId,
              position: { gte: newPosition, lt: oldPosition },
            },
            data: { position: { increment: 1 } },
          });
        }
      } else {
        await tx.task.updateMany({
          where: { columnId: oldColumnId, position: { gt: oldPosition } },
          data: { position: { decrement: 1 } },
        });
        await tx.task.updateMany({
          where: { columnId: newColumnId, position: { gte: newPosition } },
          data: { position: { increment: 1 } },
        });
      }

      await tx.task.update({
        where: { id: taskId },
        data: { columnId: newColumnId, position: newPosition },
      });
    });
  }

  async addComment(
    taskId: string,
    createCommentDto: CreateCommentDto,
    author: User,
  ) {
    const { text } = createCommentDto;

    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Задача с ID "${taskId}" не найдена`);
    }

    const mentions = text.match(
      /@\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+/g,
    );

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          text,
          taskId,
          authorId: author.id,
        },
      });

      if (mentions) {
        const emailsToFind = mentions.map((mention) => mention.substring(1));
        const usersToNotify = await tx.user.findMany({
          where: { email: { in: emailsToFind } },
        });

        for (const user of usersToNotify) {
          if (user.id === author.id) continue;

          await tx.notification.create({
            data: {
              recipientId: user.id,
              text: `${author.name} упомянул(а) вас в задаче "${task.humanReadableId}"`,
              source_url: `/tasks/${task.humanReadableId}`,
            },
          });
        }
      }

      return comment;
    });
  }
}