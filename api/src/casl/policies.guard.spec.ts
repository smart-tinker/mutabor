import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PoliciesGuard } from './policies.guard';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { Role } from './roles.enum';
import { CanViewProjectPolicy, CanEditProjectContentPolicy, CanManageProjectSettingsPolicy } from './project-policies.handler';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

const mockProjectsService = {
  getUserRoleForProject: jest.fn(),
};

const mockTasksService = {
  getUserRoleForTask: jest.fn(),
  getProjectIdByHumanId: jest.fn(),
};

describe('PoliciesGuard', () => {
  let guard: PoliciesGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (user: any, params: any, path: string): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
          path,
        }),
      }),
    } as any;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesGuard,
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: TasksService, useValue: mockTasksService },
        { 
          provide: Reflector, 
          useValue: { 
            getAllAndOverride: jest.fn(),
            get: jest.fn(),
          } 
        },
      ],
    }).compile();

    guard = module.get<PoliciesGuard>(PoliciesGuard);
    reflector = module.get<Reflector>(Reflector);
  });
  
  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('Authorization Logic', () => {
    const user = { id: 'user-id-1', role: 'user' };

    it('should DENY access if policy check fails', async () => {
      mockProjectsService.getUserRoleForProject.mockResolvedValue(Role.Editor);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(false); 
      (reflector.get as jest.Mock).mockReturnValue([CanManageProjectSettingsPolicy]);

      const context = createMockExecutionContext(user, { id: 1 }, '/api/v1/projects/1/settings');
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW access if policy check passes', async () => {
      mockProjectsService.getUserRoleForProject.mockResolvedValue(Role.Owner);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(false);
      (reflector.get as jest.Mock).mockReturnValue([CanManageProjectSettingsPolicy]);

      const context = createMockExecutionContext(user, { id: 1 }, '/api/v1/projects/1/settings');
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should ALLOW access for admin role regardless of policies', async () => {
      const adminUser = { ...user, role: 'admin' };
      (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(false);

      const context = createMockExecutionContext(adminUser, { id: 1 }, '/api/v1/projects/1');
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should ALLOW access if route is public', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(true); 

      const context = createMockExecutionContext(null, {}, '/health');
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
    
    it('should call tasksService for task-related routes', async () => {
      mockTasksService.getUserRoleForTask.mockResolvedValue(Role.Editor);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(false);
      (reflector.get as jest.Mock).mockReturnValue([CanEditProjectContentPolicy]);
      
      const context = createMockExecutionContext(user, { id: 'task-uuid' }, '/api/v1/tasks/task-uuid');
      await guard.canActivate(context);

      expect(mockTasksService.getUserRoleForTask).toHaveBeenCalledWith('task-uuid', user.id);
      expect(mockProjectsService.getUserRoleForProject).not.toHaveBeenCalled();
    });
    
    it('should call tasksService and projectsService for human-readable ID routes', async () => {
        const hid = 'PROJ-1';
        const projectId = 123;
        mockTasksService.getProjectIdByHumanId.mockResolvedValue(projectId);
        mockProjectsService.getUserRoleForProject.mockResolvedValue(Role.Viewer);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
        (reflector.get as jest.Mock).mockReturnValue([CanViewProjectPolicy]);

        const context = createMockExecutionContext(user, { hid }, `/api/v1/tasks/${hid}`);
        await guard.canActivate(context);

        expect(mockTasksService.getProjectIdByHumanId).toHaveBeenCalledWith(hid);
        expect(mockProjectsService.getUserRoleForProject).toHaveBeenCalledWith(projectId, user.id);
    });
  });
});