import { Controller, Post, Body, Get, Param, Patch, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { UserRecord } from 'src/types/db-records';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTaskDto: CreateTaskDto, @Req() req) {
    const user = req.user as UserRecord;
    return this.tasksService.createTask(createTaskDto, user);
  }

  // Note: /:id expects a UUID. A new endpoint is added for human-readable IDs.
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const user = req.user as UserRecord;
    return this.tasksService.findTaskById(id, user);
  }

  // --- NEW ENDPOINT ---
  @Get('/by-hid/:hid')
  async findOneByHid(@Param('hid') hid: string, @Req() req) {
      const user = req.user as UserRecord;
      return this.tasksService.findTaskByHumanId(hid, user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req,
  ) {
    const user = req.user as UserRecord;
    return this.tasksService.updateTask(id, updateTaskDto, user);
  }

  @Patch(':id/move')
  @HttpCode(HttpStatus.OK)
  async move(
    @Param('id') id: string,
    @Body() moveTaskDto: MoveTaskDto,
    @Req() req,
  ) {
    const user = req.user as UserRecord;
    return this.tasksService.moveTask(id, moveTaskDto, user);
  }

  // Comments Endpoints
  @Post(':taskId/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Param('taskId') taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req,
  ) {
    const user = req.user as UserRecord;
    return this.tasksService.addCommentToTask(taskId, createCommentDto, user);
  }

  @Get(':taskId/comments')
  async getComments(
    @Param('taskId') taskId: string,
    @Req() req,
  ) {
    const user = req.user as UserRecord;
    return this.tasksService.getCommentsForTask(taskId, user);
  }
}