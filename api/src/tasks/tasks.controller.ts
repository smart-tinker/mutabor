// Полный путь: mutabor/api/src/tasks/tasks.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { AuthGuard } from '@nestjs/passport';
import { MoveTaskDto } from './dto/move-task.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

@UseGuards(AuthGuard('jwt'))
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOneByHumanId(id);
  }

  @Patch(':id/move')
  @HttpCode(HttpStatus.OK)
  async move(@Param('id') humanId: string, @Body() moveTaskDto: MoveTaskDto) {
    // 1. Находим задачу по ее читаемому ID, чтобы получить внутренний UUID
    const task = await this.tasksService.findOneByHumanId(humanId);
    // 2. Вызываем сервис перемещения с настоящим UUID
    return this.tasksService.move(task.id, moveTaskDto);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') humanId: string,
    @Body() createCommentDto: CreateCommentDto,
    @GetUser() user: User,
  ) {
    const task = await this.tasksService.findOneByHumanId(humanId);
    // Теперь передаем всего пользователя, а не только ID
    return this.tasksService.addComment(task.id, createCommentDto, user);
  }
}