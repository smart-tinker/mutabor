import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common'; // Added HttpCode, HttpStatus
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Path to your JwtAuthGuard
import { User } from '@prisma/client'; // Import User from Prisma or your user decorator
// If you have a @User decorator to extract user from request:
// import { User as CurrentUser } from '../auth/decorators/user.decorator';

@UseGuards(JwtAuthGuard) // Apply guard to the whole controller
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED) // Added HttpCode
  async create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
    // Assuming user object is attached to req by JwtAuthGuard
    const user = req.user as User;
    return this.projectsService.createProject(createProjectDto, user);
  }

  @Get()
  async findAll(@Req() req) {
    const user = req.user as User;
    return this.projectsService.findAllProjectsForUser(user);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const user = req.user as User;
    return this.projectsService.findProjectById(id, user);
  }

  @Post(':projectId/members')
  @HttpCode(HttpStatus.CREATED) // Added HttpCode
  async addMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() addMemberDto: AddMemberDto,
    @Req() req,
  ) {
    const user = req.user as User;
    return this.projectsService.addMemberToProject(projectId, addMemberDto, user.id);
  }

  @Get(':projectId/members')
  async getMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Req() req,
  ) {
    const user = req.user as User;
    // Ensure user has access to the project first (findProjectById also checks membership)
    await this.projectsService.findProjectById(projectId, user);
    return this.projectsService.getProjectMembers(projectId, user.id);
  }
}
