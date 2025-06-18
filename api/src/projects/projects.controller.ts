// Полный путь: mutabor/api/src/projects/projects.controller.ts

import { Controller, Get, Post, Body, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client'; // Импортируем тип User для строгой типизации
import { AddMemberDto } from './dto/add-member.dto'; 

@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @GetUser() user: User) {
    // Мы получаем пользователя напрямую и с правильным типом User
    return this.projectsService.create(createProjectDto, user.id);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.projectsService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { // <-- ParseIntPipe для преобразования в число
    // TODO: В будущем здесь нужна проверка, что текущий пользователь
    // имеет доступ к этому проекту. Пока для простоты опускаем.
    return this.projectsService.findOneById(id);
  }

  @Post(':id/members')
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() addMemberDto: AddMemberDto,
    @GetUser() user: User,
  ) {
    return this.projectsService.addMember(id, addMemberDto, user.id);
  }
}