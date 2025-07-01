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

@ApiBearerAuth()
@ApiTags('Projects')
// ### ИЗМЕНЕНИЕ: PoliciesGuard убран, осталась только проверка аутентификации. ###
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
  @ApiOperation({ summary: 'Get full details of a project (board, tasks, members)' })
  // Права доступа к проекту проверяются внутри сервиса
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getProjectDetails(id);
  }
  
  @Put(':id/settings')
  @ApiOperation({ summary: 'Update project settings (name, prefix, types)' })
  // Права доступа к проекту проверяются внутри сервиса
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
  // Права доступа к проекту проверяются внутри сервиса
  createColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createColumnDto: CreateColumnDto,
  ) {
    return this.projectsService.createColumn(projectId, createColumnDto);
  }

  @Patch(':projectId/columns/:columnId')
  @ApiOperation({ summary: 'Update a column\'s name' })
  @HttpCode(HttpStatus.OK)
  // Права доступа к проекту проверяются внутри сервиса
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
  // Права доступа к проекту проверяются внутри сервиса
  deleteColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('columnId', ParseUUIDPipe) columnId: string,
  ) {
    return this.projectsService.deleteColumn(projectId, columnId);
  }

  // --- Members ---

  @Post(':projectId/members')
  @ApiOperation({ summary: 'Add a new member to a project' })
  // Права доступа к проекту проверяются внутри сервиса
  addMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.projectsService.addMemberToProject(projectId, addMemberDto);
  }

  @Get(':projectId/members')
  @ApiOperation({ summary: 'Get all members of a project' })
  // Права доступа к проекту проверяются внутри сервиса
  getMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.getProjectMembers(projectId);
  }
}