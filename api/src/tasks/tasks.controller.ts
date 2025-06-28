import { Controller, Post, Body, Get, Param, Patch, UseGuards, Req, HttpCode, HttpStatus, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { UserRecord } from '../types/db-records';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { CanEditProjectContentPolicy } from '../casl/project-policies.handler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Tasks & Comments')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' ###
  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create a new task in a project' })
  @CheckPolicies(CanEditProjectContentPolicy)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createTaskDto: CreateTaskDto,
    @Req() req,
  ) {
    const user = req.user as UserRecord;
    return this.tasksService.createTask(projectId, createTaskDto, user);
  }

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' ###
  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get a task by its UUID' })
  @CheckPolicies(CanEditProjectContentPolicy)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findTaskById(id);
  }

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' ###
  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update a task' })
  @CheckPolicies(CanEditProjectContentPolicy)
  @HttpCode(HttpStatus.OK)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, updateTaskDto);
  }

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' ###
  @Patch('tasks/:id/move')
  @ApiOperation({ summary: 'Move a task between columns or positions' })
  @CheckPolicies(CanEditProjectContentPolicy)
  @HttpCode(HttpStatus.OK)
  move(@Param('id', ParseUUIDPipe) id: string, @Body() moveTaskDto: MoveTaskDto) {
    return this.tasksService.moveTask(id, moveTaskDto);
  }

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' ###
  @Post('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  @CheckPolicies(CanEditProjectContentPolicy)
  @HttpCode(HttpStatus.CREATED)
  createComment(@Param('taskId', ParseUUIDPipe) taskId: string, @Body() createCommentDto: CreateCommentDto, @Req() req) {
    const user = req.user as UserRecord;
    return this.tasksService.addCommentToTask(taskId, createCommentDto, user);
  }

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' ###
  @Get('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Get all comments for a task' })
  @CheckPolicies(CanEditProjectContentPolicy)
  getComments(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.tasksService.getCommentsForTask(taskId);
  }
}