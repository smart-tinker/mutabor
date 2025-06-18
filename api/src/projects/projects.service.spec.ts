import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { User, Project, Column } from '@prisma/client';

// Mock Prisma Client
const mockPrismaService = {
  project: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockUser: User = { id: 'user-1', email: 'test@example.com', name: 'Test User', password: 'hashedpassword', createdAt: new Date(), updatedAt: new Date() };
const mockProject: Project & { columns?: Column[] } = { id: 1, name: 'Test Project', taskPrefix: 'TP', lastTaskNumber: 0, ownerId: 'user-1', createdAt: new Date(), updatedAt: new Date() };
const mockColumn: Column = { id: 'col-1', name: 'To Do', position: 0, projectId: 1, createdAt: new Date(), updatedAt: new Date() };
mockProject.columns = [mockColumn];


describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    it('should create a project with default columns', async () => {
      const createDto = { name: 'New Project', prefix: 'NP' };
      const expectedProject = { ...mockProject, name: createDto.name, taskPrefix: createDto.prefix, columns: [
        { name: 'To Do', position: 0 },
        { name: 'In Progress', position: 1 },
        { name: 'Done', position: 2 },
      ]};
      mockPrismaService.project.create.mockResolvedValue(expectedProject);

      const result = await service.createProject(createDto, mockUser);
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          taskPrefix: createDto.prefix,
          ownerId: mockUser.id,
          columns: {
            create: [
              { name: 'To Do', position: 0 },
              { name: 'In Progress', position: 1 },
              { name: 'Done', position: 2 },
            ],
          },
        },
        include: { columns: true },
      });
      expect(result).toEqual(expectedProject);
    });
  });

  describe('findAllProjectsForUser', () => {
    it('should return projects for a user', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([mockProject]);
      const result = await service.findAllProjectsForUser(mockUser);
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { ownerId: mockUser.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockProject]);
    });
  });

  describe('findProjectById', () => {
    it('should return a project if user is owner', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      const result = await service.findProjectById(mockProject.id, mockUser);
      expect(prisma.project.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: mockProject.id } }));
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);
      await expect(service.findProjectById(999, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const otherUser: User = { ...mockUser, id: 'user-2' };
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject); // Project owned by mockUser (user-1)
      await expect(service.findProjectById(mockProject.id, otherUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
