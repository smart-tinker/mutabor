import { Controller, Post, Body, Get, Param, Patch, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
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
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req,
  ) {
    const user = req.user as User;
    return this.tasksService.updateTask(id, updateTaskDto, user);
  }

  @Patch(':id/move')
  async move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moveTaskDto: MoveTaskDto,
    @Req() req,
  ) {
    const user = req.user as User;
    return this.tasksService.moveTask(id, moveTaskDto, user);
  }
}
