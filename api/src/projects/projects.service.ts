import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { User } from '@prisma/client'; // Assuming User type is available via Prisma

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async createProject(createProjectDto: CreateProjectDto, user: User) {
    const newProject = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        taskPrefix: createProjectDto.prefix,
        ownerId: user.id,
        // Create default columns
        columns: {
          create: [
            { name: 'To Do', position: 0 },
            { name: 'In Progress', position: 1 },
            { name: 'Done', position: 2 },
          ],
        },
      },
      include: {
        columns: true, // Include columns in the response
      },
    });
    return newProject;
  }

  async findAllProjectsForUser(user: User) {
    return this.prisma.project.findMany({
      where: {
        ownerId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findProjectById(projectId: number, user: User) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        columns: {
          orderBy: {
            position: 'asc',
          },
          include: {
            tasks: { // This will be useful when Task model and service are ready
              orderBy: {
                position: 'asc',
              },
            },
          },
        },
        // Include tasks directly under project if that's a feature,
        // or all tasks for the board view (tasks are already nested under columns)
        // tasks: {
        //   orderBy: {
        //     createdAt: 'asc'
        //   }
        // }
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    // For Phase 2, only owner can access. Phase 3 will introduce members.
    if (project.ownerId !== user.id) {
      throw new ForbiddenException('You do not have permission to access this project.');
    }
    return project;
  }
}
