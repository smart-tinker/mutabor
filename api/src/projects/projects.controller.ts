import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus, Put, Patch, ParseUUIDPipe, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { CanManageProjectSettingsPolicy, CanEditProjectContentPolicy } from '../casl/project-policies.handler';

@ApiBearerAuth()
@ApiTags('Projects')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard) // Этот гвард не нужен, т.к. есть глобальный
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
    return this.projectsService.createProject(createProjectDto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard) // Этот гвард не нужен, т.к. есть глобальный
  findAll(@Req() req) {
    return this.projectsService.findAllProjectsForUser(req.user.id);
  }

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' из вызова декоратора ###
  @Get(':id')
  @CheckPolicies(CanEditProjectContentPolicy)
  findOne(@Param('id', ParseIntPipe) id: number) {
    // Всю необходимую информацию гвард получит из параметров запроса
    return this.projectsService.getProjectDetails(id);
  }
  
  // ### ИСПРАВЛЕНИЕ: Убрали 'new' из вызова декоратора ###
  @Put(':id/settings')
  @CheckPolicies(CanManageProjectSettingsPolicy)
  updateProjectSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectSettingsDto: UpdateProjectSettingsDto,
  ) {
    return this.projectsService.updateProjectSettings(id, updateProjectSettingsDto);
  }
  
  // --- Columns CRUD ---

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' из вызова декоратора ###
  @Post(':projectId/columns')
  @HttpCode(HttpStatus.CREATED)
  @CheckPolicies(CanEditProjectContentPolicy)
  createColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createColumnDto: CreateColumnDto,
  ) {
    return this.projectsService.createColumn(projectId, createColumnDto);
  }

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' из вызова декоратора ###
  @Patch(':projectId/columns/:columnId')
  @HttpCode(HttpStatus.OK)
  @CheckPolicies(CanEditProjectContentPolicy)
  updateColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @Body() updateColumnDto: UpdateColumnDto,
  ) {
    return this.projectsService.updateColumn(projectId, columnId, updateColumnDto);
  }

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' из вызова декоратора ###
  @Delete(':projectId/columns/:columnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies(CanEditProjectContentPolicy)
  deleteColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('columnId', ParseUUIDPipe) columnId: string,
  ) {
    return this.projectsService.deleteColumn(projectId, columnId);
  }

  // --- Members ---

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' из вызова декоратора ###
  @Post(':projectId/members')
  @CheckPolicies(CanManageProjectSettingsPolicy)
  addMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.projectsService.addMemberToProject(projectId, addMemberDto);
  }

  // ### ИСПРАВЛЕНИЕ: Убрали 'new' из вызова декоратора ###
  @Get(':projectId/members')
  @CheckPolicies(CanEditProjectContentPolicy)
  getMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.getProjectMembers(projectId);
  }
}