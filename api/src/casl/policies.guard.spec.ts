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
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } }, // ### ИЗМЕНЕНИЕ: Внедряем мок Reflector
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
      // Мокируем, что эндпоинт НЕ публичный и требует политику CanManageProjectSettingsPolicy
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false) // For IS_PUBLIC_KEY
        .mockReturnValueOnce([CanManageProjectSettingsPolicy]); // For CHECK_POLICIES_KEY

      const context = createMockExecutionContext(user, { id: 1 }, '/api/v1/projects/1/settings');
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW access if policy check passes', async () => {
      mockProjectsService.getUserRoleForProject.mockResolvedValue(Role.Owner);
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce([CanManageProjectSettingsPolicy]);

      const context = createMockExecutionContext(user, { id: 1 }, '/api/v1/projects/1/settings');
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should ALLOW access for admin role regardless of policies', async () => {
      const adminUser = { ...user, role: 'admin' };
      (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(false); // Не публичный

      const context = createMockExecutionContext(adminUser, { id: 1 }, '/api/v1/projects/1');
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should ALLOW access if route is public', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(true); // Публичный

      const context = createMockExecutionContext(null, {}, '/health');
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
    
    it('should call tasksService for task-related routes', async () => {
      mockTasksService.getUserRoleForTask.mockResolvedValue(Role.Editor);
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce([CanEditProjectContentPolicy]);
      
      const context = createMockExecutionContext(user, { id: 'task-uuid' }, '/api/v1/tasks/task-uuid');
      await guard.canActivate(context);

      expect(mockTasksService.getUserRoleForTask).toHaveBeenCalledWith('task-uuid', user.id);
      expect(mockProjectsService.getUserRoleForProject).not.toHaveBeenCalled();
    });
  });
});