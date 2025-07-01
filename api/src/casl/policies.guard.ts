import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';
import { PolicyHandlerClass } from './policy.interface';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { Role } from './roles.enum';
import { AuthenticatedUser } from '../auth/jwt.strategy';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private projectsService: ProjectsService,
    private tasksService: TasksService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new InternalServerErrorException('PoliciesGuard used without a valid user context. Ensure JwtAuthGuard runs first.');
    }
    
    // ### ИЗМЕНЕНИЕ: Проверка на глобального администратора
    // Если у пользователя есть поле `role` и оно равно 'admin', даем доступ ко всему.
    if ((user as any).role === 'admin') {
      return true;
    }

    const policyHandlers =
      this.reflector.get<PolicyHandlerClass[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    if (policyHandlers.length === 0) {
      return true;
    }
    
    const params = request.params;
    let userRole: Role | null = null;

    if (params.taskId || params.id && request.path.includes('/tasks/')) {
        const taskId = params.taskId || params.id;
        userRole = await this.tasksService.getUserRoleForTask(taskId, user.id);
    } else if (params.projectId || params.id) {
        const projectId = parseInt(params.projectId || params.id, 10);
        if (isNaN(projectId)) throw new NotFoundException('Invalid Project ID format.');
        userRole = await this.projectsService.getUserRoleForProject(projectId, user.id);
    }

    if (userRole === null) {
        throw new ForbiddenException('You do not have permission to access this resource.');
    }
    
    const allPoliciesPassed = policyHandlers.every((Handler) => {
        const handler = new Handler();
        return handler.handle({ role: userRole });
    });

    if (!allPoliciesPassed) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    
    return true;
  }
}