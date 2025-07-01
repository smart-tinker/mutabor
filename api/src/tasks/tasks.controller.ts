import { Controller, Post, Body, Get, Param, Patch, UseGuards, Req, HttpCode, HttpStatus, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Tasks & Comments')
// ### ИЗМЕНЕНИЕ: PoliciesGuard убран, осталась только проверка аутентификации. ###
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create a new task in a project' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createTaskDto: CreateTaskDto,
    @Req() req,
  ) {
    const user = req.user as AuthenticatedUser;
    // Права доступа к проекту проверяются внутри сервиса
    return this.tasksService.createTask(projectId, createTaskDto, user);
  }

  @Get('tasks/:hid')
  @ApiOperation({ summary: 'Get a task by its Human-Readable ID (e.g., MUT-1)' })
  // Права доступа к проекту проверяются внутри сервиса
  findOne(@Param('hid') hid: string) {
    return this.tasksService.findTaskByHumanId(hid);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update a task' })
  @HttpCode(HttpStatus.OK)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateTaskDto: UpdateTaskDto, @Req() req) {
    const user = req.user as AuthenticatedUser;
    // Права доступа к проекту проверяются внутри сервиса
    return this.tasksService.updateTask(id, updateTaskDto, user);
  }

  @Patch('tasks/:id/move')
  @ApiOperation({ summary: 'Move a task between columns or positions' })
  @HttpCode(HttpStatus.OK)
  move(@Param('id', ParseUUIDPipe) id: string, @Body() moveTaskDto: MoveTaskDto, @Req() req) {
    const user = req.user as AuthenticatedUser;
    // Права доступа к проекту проверяются внутри сервиса
    return this.tasksService.moveTask(id, moveTaskDto, user);
  }

  @Post('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  @HttpCode(HttpStatus.CREATED)
  createComment(@Param('taskId', ParseUUIDPipe) taskId: string, @Body() createCommentDto: CreateCommentDto, @Req() req) {
    const user = req.user as AuthenticatedUser;
    // Права доступа к проекту проверяются внутри сервиса
    return this.tasksService.addCommentToTask(taskId, createCommentDto, user);
  }

  @Get('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Get all comments for a task' })
  getComments(@Param('taskId', ParseUUIDPipe) taskId: string) {
    // Права доступа к проекту проверяются внутри сервиса
    return this.tasksService.getCommentsForTask(taskId);
  }
}