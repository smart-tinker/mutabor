import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, Project } from '@prisma/client';

const mockUser: User = { id: 'user-1', email: 'test@example.com', name: 'Test User', password: 'pwd', createdAt: new Date(), updatedAt: new Date() };
const mockProject: Project = { id: 1, name: 'Test Project', taskPrefix: 'TP', lastTaskNumber: 0, ownerId: 'user-1', createdAt: new Date(), updatedAt: new Date() };

// Mock ProjectsService
const mockProjectsService = {
  createProject: jest.fn().mockResolvedValue(mockProject),
  findAllProjectsForUser: jest.fn().mockResolvedValue([mockProject]),
  findProjectById: jest.fn().mockResolvedValue(mockProject),
};

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    })
    // Mock JwtAuthGuard to always allow access for controller tests
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: jest.fn(() => true) })
    .compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const mockReq = { user: mockUser };

  describe('create', () => {
    it('should call service.createProject and return a project', async () => {
      const createDto = { name: 'New Project', prefix: 'NP' };
      const result = await controller.create(createDto, mockReq);
      expect(service.createProject).toHaveBeenCalledWith(createDto, mockUser);
      expect(result).toEqual(mockProject);
    });
  });

  describe('findAll', () => {
    it('should call service.findAllProjectsForUser and return projects', async () => {
      const result = await controller.findAll(mockReq);
      expect(service.findAllProjectsForUser).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([mockProject]);
    });
  });

  describe('findOne', () => {
    it('should call service.findProjectById and return a project', async () => {
      const result = await controller.findOne(mockProject.id, mockReq);
      expect(service.findProjectById).toHaveBeenCalledWith(mockProject.id, mockUser);
      expect(result).toEqual(mockProject);
    });
  });
});
