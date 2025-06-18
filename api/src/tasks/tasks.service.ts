import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common'; // Added Inject
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { User } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway'; // Import EventsGateway

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    @Inject(EventsGateway) private eventsGateway: EventsGateway, // Inject EventsGateway
  ) {}

  async createTask(createTaskDto: CreateTaskDto, user: User) {
    const { projectId, columnId, title, description, assigneeId } = createTaskDto;

    // Verify project and column exist and user has access to project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { columns: { where: { id: columnId } } },
    });

    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found.`); // Corrected this line
    if (project.ownerId !== user.id) throw new ForbiddenException('No permission for this project.'); // Corrected this line
    if (!project.columns || project.columns.length === 0) throw new NotFoundException(`Column ${columnId} not found in project ${projectId}.`); // Corrected this line

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: { lastTaskNumber: { increment: 1 } },
    });
    const taskNumber = updatedProject.lastTaskNumber;
    const humanReadableId = `${project.taskPrefix}-${taskNumber}`;
    const tasksInColumn = await this.prisma.task.count({ where: { columnId } });
    const position = tasksInColumn;

    const newTask = await this.prisma.task.create({
      data: {
        title,
        description,
        humanReadableId,
        taskNumber,
        position,
        projectId,
        columnId,
        creatorId: user.id,
        assigneeId: assigneeId || null,
      },
    });

    this.eventsGateway.emitTaskCreated(newTask); // Emit event
    return newTask;
  }

  async findTaskById(taskId: string, user: User) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }
    const project = await this.prisma.project.findUnique({ where: { id: task.projectId } });
    // Added a null check for project, which is good practice.
    if (!project || project.ownerId !== user.id) {
      throw new ForbiddenException('You do not have permission to view this task.');
    }
    return task;
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto, user: User) {
    const task = await this.findTaskById(taskId, user); // Auth check
    if (updateTaskDto.columnId && updateTaskDto.columnId !== task.columnId) {
        throw new BadRequestException('To move a task, please use the dedicated move endpoint.');
    }

    const updatedTask = await this.prisma.task.update({
        where: { id: taskId },
        data: { ...updateTaskDto },
    });
    this.eventsGateway.emitTaskUpdated(updatedTask); // Emit event
    return updatedTask;
  }


  async moveTask(taskId: string, moveTaskDto: MoveTaskDto, user: User) {
    const { newColumnId, newPosition } = moveTaskDto;
    // ... (existing logic for finding task, project, targetColumn, permission checks)
    const taskToMove = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!taskToMove) throw new NotFoundException(`Task with ID ${taskId} not found.`);

    const project = await this.prisma.project.findUnique({ where: { id: taskToMove.projectId } });
    if (!project || project.ownerId !== user.id) {
      throw new ForbiddenException('You do not have permission to move tasks in this project.');
    }

    const targetColumn = await this.prisma.column.findUnique({ where: { id: newColumnId } });
    if (!targetColumn || targetColumn.projectId !== taskToMove.projectId) {
      throw new NotFoundException(`Target column with ID ${newColumnId} not found or does not belong to the same project.`);
    }

    const oldColumnId = taskToMove.columnId;
    const oldPosition = taskToMove.position;
    let finalMovedTask;

    await this.prisma.$transaction(async (tx) => {
      // ... (existing transaction logic for reordering)
      if (oldColumnId !== newColumnId) {
        await tx.task.updateMany({
          where: { columnId: oldColumnId, position: { gt: oldPosition } },
          data: { position: { decrement: 1 } },
        });
      } else {
         if (newPosition < oldPosition) {
            await tx.task.updateMany({
                where: { columnId: oldColumnId, position: { gte: newPosition, lt: oldPosition }},
                data: { position: { increment: 1 }}
            });
         } else if (newPosition > oldPosition) {
            await tx.task.updateMany({
                where: { columnId: oldColumnId, position: { gt: oldPosition, lte: newPosition }},
                data: { position: { decrement: 1 }}
            });
         }
      }

      if (oldColumnId !== newColumnId) {
        await tx.task.updateMany({
          where: { columnId: newColumnId, position: { gte: newPosition } },
          data: { position: { increment: 1 } },
        });
      }

      finalMovedTask = await tx.task.update({ // Assign to outer scope variable
        where: { id: taskId },
        data: { columnId: newColumnId, position: newPosition },
      });
      return finalMovedTask; // Return from transaction
    });

    // Ensure finalMovedTask is the one from the transaction before emitting
    if(finalMovedTask) {
        this.eventsGateway.emitTaskMoved(finalMovedTask); // Emit event
    } else {
        // Fallback or error, though transaction should ensure it's set
        finalMovedTask = await this.prisma.task.findUnique({where: {id: taskId}});
        if (finalMovedTask) this.eventsGateway.emitTaskMoved(finalMovedTask);
    }
    return finalMovedTask;
  }
}
