import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus, Put, Patch, ParseUUIDPipe, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { CanManageProjectSettingsPolicy, CanEditProjectContentPolicy } from '../casl/project-policies.handler';
import { UserRecord } from 'src/types/db-records';

@ApiBearerAuth()
@ApiTags('Projects')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
    const user = req.user as UserRecord;
    return this.projectsService.createProject(createProjectDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for the current user' })
  findAll(@Req() req) {
    const user = req.user as UserRecord;
    return this.projectsService.findAllProjectsForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full details of a project (board, tasks, members)' })
  @CheckPolicies(CanEditProjectContentPolicy) // ### ИСПРАВЛЕНО: Убран 'new'
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getProjectDetails(id);
  }
  
  @Put(':id/settings')
  @ApiOperation({ summary: 'Update project settings (name, prefix, types)' })
  @CheckPolicies(CanManageProjectSettingsPolicy) // ### ИСПРАВЛЕНО: Убран 'new'
  updateProjectSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectSettingsDto: UpdateProjectSettingsDto,
  ) {
    return this.projectsService.updateProjectSettings(id, updateProjectSettingsDto);
  }
  
  // --- Columns CRUD ---

  @Post(':projectId/columns')
  @ApiOperation({ summary: 'Create a new column in a project' })
  @HttpCode(HttpStatus.CREATED)
  @CheckPolicies(CanEditProjectContentPolicy) // ### ИСПРАВЛЕНО: Убран 'new'
  createColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createColumnDto: CreateColumnDto,
  ) {
    return this.projectsService.createColumn(projectId, createColumnDto);
  }

  @Patch(':projectId/columns/:columnId')
  @ApiOperation({ summary: 'Update a column\'s name' })
  @HttpCode(HttpStatus.OK)
  @CheckPolicies(CanEditProjectContentPolicy) // ### ИСПРАВЛЕНО: Убран 'new'
  updateColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @Body() updateColumnDto: UpdateColumnDto,
  ) {
    return this.projectsService.updateColumn(projectId, columnId, updateColumnDto);
  }

  @Delete(':projectId/columns/:columnId')
  @ApiOperation({ summary: 'Delete a column and move its tasks' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies(CanEditProjectContentPolicy) // ### ИСПРАВЛЕНО: Убран 'new'
  deleteColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('columnId', ParseUUIDPipe) columnId: string,
  ) {
    return this.projectsService.deleteColumn(projectId, columnId);
  }

  // --- Members ---

  @Post(':projectId/members')
  @ApiOperation({ summary: 'Add a new member to a project' })
  @CheckPolicies(CanManageProjectSettingsPolicy) // ### ИСПРАВЛЕНО: Убран 'new'
  addMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.projectsService.addMemberToProject(projectId, addMemberDto);
  }

  @Get(':projectId/members')
  @ApiOperation({ summary: 'Get all members of a project' })
  @CheckPolicies(CanEditProjectContentPolicy) // ### ИСПРАВЛЕНО: Убран 'new'
  getMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.getProjectMembers(projectId);
  }
}