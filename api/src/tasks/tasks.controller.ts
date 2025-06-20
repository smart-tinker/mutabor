import { Controller, Post, Body, Get, Param, Patch, UseGuards, Req, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common'; // Added HttpCode, HttpStatus
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED) // Added HttpCode
  async create(@Body() createTaskDto: CreateTaskDto, @Req() req) {
    const user = req.user as User;
    return this.tasksService.createTask(createTaskDto, user);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    const user = req.user as User;
    return this.tasksService.findTaskById(id, user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK) // Added HttpCode
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req,
  ) {
    const user = req.user as User;
    return this.tasksService.updateTask(id, updateTaskDto, user);
  }

  @Patch(':id/move')
  @HttpCode(HttpStatus.OK) // Added HttpCode
  async move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moveTaskDto: MoveTaskDto,
    @Req() req,
  ) {
    const user = req.user as User;
    return this.tasksService.moveTask(id, moveTaskDto, user);
  }

  // Comments Endpoints
  @Post(':taskId/comments')
  @HttpCode(HttpStatus.CREATED) // Added HttpCode
  // @UseGuards(JwtAuthGuard) // Guard is already on controller level
  async createComment(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req,
  ) {
    const user = req.user as User;
    return this.tasksService.addCommentToTask(taskId, createCommentDto, user);
  }

  @Get(':taskId/comments')
  // @UseGuards(JwtAuthGuard) // Guard is already on controller level
  async getComments(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() req,
  ) {
    const user = req.user as User;
    return this.tasksService.getCommentsForTask(taskId, user);
  }
}
