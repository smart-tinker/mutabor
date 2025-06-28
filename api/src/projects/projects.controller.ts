import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus, Put, Patch, ParseUUIDPipe, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { CreateColumnDto } from './dto/create-column.dto'; // ### ДОБАВЛЕНО ###
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
    return this.projectsService.createProject(createProjectDto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req) {
    return this.projectsService.findAllProjectsForUser(req.user.id);
  }

  @Get(':id')
  @CheckPolicies(new CanEditProjectContentPolicy())
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.projectsService.getProjectDetails(id, req.user.id);
  }
  
  @Put(':id/settings')
  @CheckPolicies(new CanManageProjectSettingsPolicy())
  updateProjectSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectSettingsDto: UpdateProjectSettingsDto,
    @Req() req,
  ) {
    return this.projectsService.updateProjectSettings(id, req.user.id, updateProjectSettingsDto);
  }
  
  // --- Columns CRUD ---

  @Post(':projectId/columns')
  @HttpCode(HttpStatus.CREATED)
  @CheckPolicies(new CanEditProjectContentPolicy())
  createColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createColumnDto: CreateColumnDto,
  ) {
    return this.projectsService.createColumn(projectId, createColumnDto);
  }

  @Patch(':projectId/columns/:columnId')
  @HttpCode(HttpStatus.OK)
  @CheckPolicies(new CanEditProjectContentPolicy())
  updateColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @Body() updateColumnDto: UpdateColumnDto,
  ) {
    return this.projectsService.updateColumn(projectId, columnId, updateColumnDto);
  }

  @Delete(':projectId/columns/:columnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies(new CanEditProjectContentPolicy())
  deleteColumn(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('columnId', ParseUUIDPipe) columnId: string,
  ) {
    return this.projectsService.deleteColumn(projectId, columnId);
  }

  // --- Members ---

  @Post(':projectId/members')
  @CheckPolicies(new CanManageProjectSettingsPolicy())
  addMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() addMemberDto: AddMemberDto,
    @Req() req,
  ) {
    return this.projectsService.addMemberToProject(projectId, addMemberDto, req.user.id);
  }

  @Get(':projectId/members')
  @CheckPolicies(new CanEditProjectContentPolicy())
  getMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Req() req,
  ) {
    return this.projectsService.getProjectMembers(projectId, req.user.id);
  }
}
