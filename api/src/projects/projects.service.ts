// Полный путь: mutabor/api/src/projects/projects.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Prisma } from '@prisma/client';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto, ownerId: string) {
    const { name, prefix } = createProjectDto;

    const existingPrefix = await this.prisma.project.findUnique({
      where: { taskPrefix: prefix },
    });
    if (existingPrefix) {
      throw new ConflictException(`Префикс "${prefix}" уже используется.`);
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const project = await tx.project.create({
        data: {
          name,
          ownerId,
          taskPrefix: prefix,
        },
      });

      const defaultColumns = ['To Do', 'In Progress', 'Done'];
      for (let i = 0; i < defaultColumns.length; i++) {
        await tx.column.create({
          data: {
            name: defaultColumns[i],
            projectId: project.id,
            position: i,
          },
        });
      }

      return project;
    });
  }

  async findAllForUser(ownerId: string) {
    return this.prisma.project.findMany({
      where: {
        ownerId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOneById(id: number) { // <-- Принимает number
    const project = await this.prisma.project.findUnique({
      where: { id }, // <-- Использует number
      include: {
        // ДОБАВЛЯЕМ УЧАСТНИКОВ
        members: {
          include: {
            user: { // Включаем публичные данные пользователя
              select: {
                id: true,
                name: true,
                email: true, // Показываем email, т.к. это список участников
              },
            },
          },
        },
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Проект с ID "${id}" не найден`);
    }

    return project;
  }

  async addMember(
    projectId: number,
    addMemberDto: AddMemberDto,
    currentUserId: string,
    ) {
      const { email } = addMemberDto;
  
      // 1. Находим проект и проверяем, является ли текущий пользователь его владельцем
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundException(`Проект с ID "${projectId}" не найден`);
      }
      if (project.ownerId !== currentUserId) {
        throw new ForbiddenException('Только владелец может добавлять участников');
      }
  
      // 2. Находим пользователя, которого хотим добавить
      const userToAdd = await this.prisma.user.findUnique({ where: { email } });
      if (!userToAdd) {
        throw new NotFoundException(`Пользователь с email "${email}" не найден`);
      }
      
      // 3. Проверяем, не является ли он уже участником
      const existingMembership = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: userToAdd.id },
        },
      });
      if (existingMembership) {
        throw new ConflictException('Этот пользователь уже является участником проекта');
      }
  
      // 4. Добавляем пользователя в проект
      return this.prisma.projectMember.create({
        data: {
          projectId,
          userId: userToAdd.id,
          role: 'member', // По умолчанию роль 'member'
        },
      });
    }
  }
