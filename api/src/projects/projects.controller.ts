import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus, Put, Patch, ParseUUIDPipe, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';
// ### ИЗМЕНЕНИЕ: Импортируем гвард, декоратор и политики ###
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { CanEditProjectContentPolicy, CanManageProjectSettingsPolicy, CanViewProjectPolicy } from '../casl/project-policies.handler';

@ApiBearerAuth()
@ApiTags('Projects')
// ### ИЗМЕНЕНИЕ: Добавляем PoliciesGuard вторым после JwtAuthGuard ###
@UseGuards(JwtAuthGuard, PoliciesGuard)
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
  @CheckPolicies(CanManageProjectSettingsPolicy) // Только владелец может добавлять
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
    return this.projectsService.getProjectMembers(projectId);
  }
}