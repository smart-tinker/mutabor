import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Path to your JwtAuthGuard
import { User } from '@prisma/client'; // Import User from Prisma or your user decorator
// If you have a @User decorator to extract user from request:
// import { User as CurrentUser } from '../auth/decorators/user.decorator';

@UseGuards(JwtAuthGuard) // Apply guard to the whole controller
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
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
}
