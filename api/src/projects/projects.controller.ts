// api/src/projects/projects.controller.ts
import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus, Put, Patch, ParseUUIDPipe, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { CanEditProjectContentPolicy, CanManageProjectSettingsPolicy, CanViewProjectPolicy } from '../casl/project-policies.handler';
import { ProjectSettingsDto } from './dto/project-settings.dto';
import { UpdateMemberDto } from './dto/update-member.dto'; // ### НОВОЕ: Импортируем DTO

@ApiBearerAuth()
@ApiTags('Projects')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
    const user = req.user as AuthenticatedUser;
    return this.projectsService.createProject(createProjectDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for the current user' })
  findAll(@Req() req) {
    const user = req.user as AuthenticatedUser;
    return this.projectsService.findAllProjectsForUser(user.id);
  }

  @Get(':id')
  @CheckPolicies(CanViewProjectPolicy)
  @ApiOperation({ summary: 'Get full details of a project (board, tasks, members)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getProjectDetails(id);
  }

  @Get(':id/settings')
  @CheckPolicies(CanManageProjectSettingsPolicy)
  @ApiOperation({ summary: 'Get project settings (name, prefix, types, statuses)' })
  @ApiResponse({ status: 200, description: 'Returns project settings.', type: ProjectSettingsDto })
  getProjectSettings(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProjectSettingsDto> {
    return this.projectsService.getProjectSettings(id);
  }
  
  @Put(':id/settings')
  @CheckPolicies(CanManageProjectSettingsPolicy)
  @ApiOperation({ summary: 'Update project settings (name, prefix, types)' })
  updateProjectSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectSettingsDto: UpdateProjectSettingsDto,
  ) {
    return this.projectsService.updateProjectSettings(id, updateProjectSettingsDto);
  }
  
  // --- Columns CRUD ---

  @Post(':projectId/columns')
  @CheckPolicies(CanEditProjectContentPolicy)
  @ApiOperation({ summary: 'Create a new column in a project' })
  @HttpCode(HttpStatus.CREATED)
  createColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createColumnDto: CreateColumnDto,
  ) {
    return this.projectsService.createColumn(projectId, createColumnDto);
  }

  @Patch(':projectId/columns/:columnId')
  @CheckPolicies(CanEditProjectContentPolicy)
  @ApiOperation({ summary: 'Update a column\'s name' })
  @HttpCode(HttpStatus.OK)
  updateColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @Body() updateColumnDto: UpdateColumnDto,
  ) {
    return this.projectsService.updateColumn(projectId, columnId, updateColumnDto);
  }

  @Delete(':projectId/columns/:columnId')
  @CheckPolicies(CanEditProjectContentPolicy)
  @ApiOperation({ summary: 'Delete a column and move its tasks' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('columnId', ParseUUIDPipe) columnId: string,
  ) {
    return this.projectsService.deleteColumn(projectId, columnId);
  }

  // --- Members ---

  @Post(':projectId/members')
  @CheckPolicies(CanManageProjectSettingsPolicy)
  @ApiOperation({ summary: 'Add a new member to a project' })
  addMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.projectsService.addMemberToProject(projectId, addMemberDto);
  }

  @Get(':projectId/members')
  @CheckPolicies(CanViewProjectPolicy)
  @ApiOperation({ summary: 'Get all members of a project' })
  getMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    // ### ИЗМЕНЕНИЕ: Теперь возвращаем и владельца, и участников одним списком
    return this.projectsService.getAllProjectParticipants(projectId);
  }

  // ### НОВЫЙ ЭНДПОИНТ ###
  @Patch(':projectId/members/:userId')
  @CheckPolicies(CanManageProjectSettingsPolicy)
  @ApiOperation({ summary: 'Update a project member\'s role' })
  @HttpCode(HttpStatus.OK)
  updateMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.projectsService.updateProjectMember(projectId, userId, updateMemberDto);
  }

  // ### НОВЫЙ ЭНДПОИНТ ###
  @Delete(':projectId/members/:userId')
  @CheckPolicies(CanManageProjectSettingsPolicy)
  @ApiOperation({ summary: 'Remove a member from a project' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.projectsService.removeMemberFromProject(projectId, userId);
  }
}