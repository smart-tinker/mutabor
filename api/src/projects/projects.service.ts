import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { User } from '@prisma/client'; // Assuming User type is available via Prisma
import { AddMemberDto } from './dto/add-member.dto.ts';

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
        members: true, // Include members for permission checking
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    if (project.ownerId !== user.id && !project.members.some(member => member.userId === user.id)) {
      throw new ForbiddenException('You do not have permission to access this project.');
    }
    return project;
  }

  async addMemberToProject(projectId: number, addMemberDto: AddMemberDto, currentUserId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    if (project.ownerId !== currentUserId) {
      throw new ForbiddenException('Only project owners can add members.');
    }

    const userToAdd = await this.prisma.user.findUnique({
      where: { email: addMemberDto.email },
    });

    if (!userToAdd) {
      throw new NotFoundException(`User with email ${addMemberDto.email} not found.`);
    }

    if (userToAdd.id === currentUserId) {
      throw new ConflictException('Cannot add the project owner as a member.');
    }

    const existingMembership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: projectId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException(`User ${addMemberDto.email} is already a member of this project.`);
    }

    return this.prisma.projectMember.create({
      data: {
        projectId: projectId,
        userId: userToAdd.id,
        role: addMemberDto.role,
      },
      include: { // Include user details in the response
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });
  }

  async getProjectMembers(projectId: number, currentUserId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      // No need to include members here if access is checked by controller calling findProjectById first
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    // Access control is expected to be handled by the controller, typically by calling
    // findProjectById(projectId, currentUser) BEFORE calling this method.
    // If this method were to be called without such prior check, it would need its own comprehensive check.

    return this.prisma.projectMember.findMany({
      where: { projectId: projectId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: {
       user: { name: 'asc' }
      }
    });
  }
}
