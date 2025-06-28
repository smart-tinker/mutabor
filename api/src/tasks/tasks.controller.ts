import { Controller, Post, Body, Get, Param, Patch, UseGuards, Req, HttpCode, HttpStatus, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { UserRecord } from 'src/types/db-records';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { CanEditProjectContentPolicy } from '../casl/project-policies.handler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Tasks & Comments')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller() // Контроллер теперь без префикса, пути определяются в методах
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ### ИЗМЕНЕНИЕ: Путь теперь вложенный и более RESTful ###
  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create a new task in a project' })
  @CheckPolicies(new CanEditProjectContentPolicy())
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createTaskDto: CreateTaskDto,
    @Req() req,
  ) {
    const user = req.user as UserRecord;
    return this.tasksService.createTask(projectId, createTaskDto, user);
  }

  // Эндпоинты для задач теперь не имеют префикса 'tasks'
  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get a task by its UUID' })
  @CheckPolicies(new CanEditProjectContentPolicy())
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    const user = req.user as UserRecord;
    return this.tasksService.findTaskById(id, user);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update a task' })
  @CheckPolicies(new CanEditProjectContentPolicy())
  @HttpCode(HttpStatus.OK)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateTaskDto: UpdateTaskDto, @Req() req) {
    const user = req.user as UserRecord;
    return this.tasksService.updateTask(id, updateTaskDto, user);
  }

  @Patch('tasks/:id/move')
  @ApiOperation({ summary: 'Move a task between columns or positions' })
  @CheckPolicies(new CanEditProjectContentPolicy())
  @HttpCode(HttpStatus.OK)
  move(@Param('id', ParseUUIDPipe) id: string, @Body() moveTaskDto: MoveTaskDto, @Req() req) {
    const user = req.user as UserRecord;
    return this.tasksService.moveTask(id, moveTaskDto, user);
  }

  // Эндпоинты для комментариев
  @Post('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  @CheckPolicies(new CanEditProjectContentPolicy())
  @HttpCode(HttpStatus.CREATED)
  createComment(@Param('taskId', ParseUUIDPipe) taskId: string, @Body() createCommentDto: CreateCommentDto, @Req() req) {
    const user = req.user as UserRecord;
    return this.tasksService.addCommentToTask(taskId, createCommentDto, user);
  }

  @Get('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Get all comments for a task' })
  @CheckPolicies(new CanEditProjectContentPolicy())
  getComments(@Param('taskId', ParseUUIDPipe) taskId: string, @Req() req) {
    const user = req.user as UserRecord;
    return this.tasksService.getCommentsForTask(taskId, user);
  }
}