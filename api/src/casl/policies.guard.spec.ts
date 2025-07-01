import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PoliciesGuard } from './policies.guard';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { Role } from './roles.enum';
import { CanViewProjectPolicy, CanEditProjectContentPolicy, CanManageProjectSettingsPolicy } from './project-policies.handler';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';

// Мокируем сервисы
const mockProjectsService = {
  getUserRoleForProject: jest.fn(),
};

const mockTasksService = {
  getUserRoleForTask: jest.fn(),
};

describe('PoliciesGuard', () => {
  let guard: PoliciesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    // Сбрасываем моки перед каждым тестом
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesGuard,
        Reflector,
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: TasksService, useValue: mockTasksService },
      ],
    }).compile();

    guard = module.get<PoliciesGuard>(PoliciesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockExecutionContext = (user: any, params: any, policies: any[], path: string): ExecutionContext => {
    jest.spyOn(reflector, 'get').mockReturnValue(policies);
    
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

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('Project Context', () => {
    const projectId = 1;
    const user = { id: 'user-id-1', email: 'test@test.com', name: 'Test User' };
    const projectPath = `/api/v1/projects/${projectId}`;

    it('should ALLOW access if user is OWNER and policy requires owner', async () => {
      mockProjectsService.getUserRoleForProject.mockResolvedValue(Role.Owner);
      const context = createMockExecutionContext(user, { id: projectId }, [CanManageProjectSettingsPolicy], projectPath);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should DENY access if user is EDITOR and policy requires owner', async () => {
      mockProjectsService.getUserRoleForProject.mockResolvedValue(Role.Editor);
      const context = createMockExecutionContext(user, { id: projectId }, [CanManageProjectSettingsPolicy], projectPath);
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW access if user is EDITOR and policy requires editor', async () => {
      mockProjectsService.getUserRoleForProject.mockResolvedValue(Role.Editor);
      const context = createMockExecutionContext(user, { id: projectId }, [CanEditProjectContentPolicy], projectPath);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
    
    it('should ALLOW access if user is VIEWER and policy requires viewer', async () => {
        mockProjectsService.getUserRoleForProject.mockResolvedValue(Role.Viewer);
        const context = createMockExecutionContext(user, { id: projectId }, [CanViewProjectPolicy], projectPath);
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should DENY access if user is not a member of the project (role is null)', async () => {
      mockProjectsService.getUserRoleForProject.mockResolvedValue(null);
      const context = createMockExecutionContext(user, { id: projectId }, [CanViewProjectPolicy], projectPath);
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Task Context', () => {
    const taskId = 'task-uuid-1';
    const user = { id: 'user-id-1', email: 'test@test.com', name: 'Test User' };
    const taskPath = `/api/v1/tasks/${taskId}`;

    it('should ALLOW access for an editor to edit content via task context', async () => {
      mockTasksService.getUserRoleForTask.mockResolvedValue(Role.Editor);
      const context = createMockExecutionContext(user, { id: taskId }, [CanEditProjectContentPolicy], taskPath);
      
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(mockTasksService.getUserRoleForTask).toHaveBeenCalledWith(taskId, user.id);
    });

    it('should DENY access for a viewer to edit content via task context', async () => {
        mockTasksService.getUserRoleForTask.mockResolvedValue(Role.Viewer);
        const context = createMockExecutionContext(user, { id: taskId }, [CanEditProjectContentPolicy], taskPath);

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Edge Cases', () => {
    it('should re-throw NotFoundException if the service throws it', async () => {
        const user = { id: 'user-id-1', email: 'test@test.com', name: 'Test User' };
        mockProjectsService.getUserRoleForProject.mockRejectedValue(new NotFoundException());
        const context = createMockExecutionContext(user, { id: 999 }, [CanViewProjectPolicy], '/api/v1/projects/999');
        
        await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });

    it('should ALLOW access if no policies are applied to the route', async () => {
        const user = { id: 'user-id-1', email: 'test@test.com', name: 'Test User' };
        const context = createMockExecutionContext(user, {}, [], '/api/v1/some/unprotected/route');
        
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });
});