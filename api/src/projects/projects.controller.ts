import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus, Put } from '@nestjs/common'; // Added HttpCode, HttpStatus, Put
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto'; // Added
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Path to your JwtAuthGuard
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'; // Added for Swagger

// If you have a @User decorator to extract user from request:
// import { User as CurrentUser } from '../auth/decorators/user.decorator';

@ApiBearerAuth() // Indicates that JWT is required for this controller
@ApiTags('Projects') // Groups endpoints in Swagger UI
@UseGuards(JwtAuthGuard) // Apply guard to the whole controller
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully.'})
  @ApiResponse({ status: 400, description: 'Invalid input.'})
  @HttpCode(HttpStatus.CREATED) // Added HttpCode
  async create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
    // Assuming user object is attached to req by JwtAuthGuard
    const user = req.user as any; // Replaced User with any
    return this.projectsService.createProject(createProjectDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for the current user' })
  @ApiResponse({ status: 200, description: 'List of projects.'})
  async findAll(@Req() req) {
    const user = req.user as any; // Replaced User with any
    return this.projectsService.findAllProjectsForUser(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project by ID' })
  @ApiResponse({ status: 200, description: 'Project details.'})
  @ApiResponse({ status: 404, description: 'Project not found.'})
  @ApiResponse({ status: 403, description: 'Access forbidden.'})
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const user = req.user as any; // Replaced User with any
    return this.projectsService.findProjectById(id, user);
  }

  // Settings Endpoints
  @Get(':id/settings')
  @ApiOperation({ summary: 'Get project settings' })
  @ApiResponse({ status: 200, description: 'Project settings data.'})
  @ApiResponse({ status: 404, description: 'Project not found.'})
  @ApiResponse({ status: 403, description: 'Access forbidden.'})
  async getProjectSettings(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ) {
    const user = req.user as any;
    return this.projectsService.getProjectSettings(id, user.id);
  }

  @Put(':id/settings')
  @ApiOperation({ summary: 'Update project settings' })
  @ApiResponse({ status: 200, description: 'Project settings updated successfully.'})
  @ApiResponse({ status: 400, description: 'Invalid input for settings.'})
  @ApiResponse({ status: 404, description: 'Project not found.'})
  @ApiResponse({ status: 403, description: 'Access forbidden (e.g., not project owner).'})
  @ApiResponse({ status: 409, description: 'Conflict (e.g., prefix already in use).'})
  async updateProjectSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectSettingsDto: UpdateProjectSettingsDto,
    @Req() req,
  ) {
    const user = req.user as any;
    return this.projectsService.updateProjectSettings(id, user.id, updateProjectSettingsDto);
  }

  // Member Endpoints
  @Post(':projectId/members')
  @ApiOperation({ summary: 'Add a member to a project' })
  @ApiResponse({ status: 201, description: 'Member added successfully.'})
  @HttpCode(HttpStatus.CREATED) // Added HttpCode
  async addMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() addMemberDto: AddMemberDto,
    @Req() req,
  ) {
    const user = req.user as any; // Replaced User with any
    return this.projectsService.addMemberToProject(projectId, addMemberDto, user.id);
  }

  @Get(':projectId/members')
  @ApiOperation({ summary: 'Get members of a project' })
  @ApiResponse({ status: 200, description: 'List of project members.'})
  async getMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Req() req,
  ) {
    const user = req.user as any; // Replaced User with any
    // ensureUserHasAccessToProject is called by getProjectMembers indirectly or directly if needed
    // For this specific setup, findProjectById ensures access before listing members.
    await this.projectsService.findProjectById(projectId, user); // Ensures user has general access
    return this.projectsService.getProjectMembers(projectId, user.id);
  }
}
