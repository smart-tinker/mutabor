// api/src/casl/policies.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';
import { PolicyHandlerClass } from './policy.interface';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { Role } from './roles.enum';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private projectsService: ProjectsService,
    private tasksService: TasksService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandlerClass[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    if (policyHandlers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    if (!user) {
      // Этого не должно произойти, если JwtAuthGuard стоит первым, но для надежности
      throw new ForbiddenException('User not authenticated.');
    }

    const projectIdParam = request.params.projectId || request.params.id;
    const taskId = request.params.taskId || (request.route.path.includes('/tasks/') ? request.params.id : null);
    
    let userRole: Role;

    try {
      if (taskId) {
        const { userRole: role } = await this.tasksService.getTaskAndProjectForPermissionCheck(taskId, user.id);
        userRole = role;
      } else if (projectIdParam) {
        const projectId = parseInt(projectIdParam, 10);
        if (isNaN(projectId)) throw new NotFoundException('Invalid Project ID');
        const { userRole: role } = await this.projectsService.getProjectAndRole(projectId, user.id);
        userRole = role;
      } else {
        throw new NotFoundException('Required project or task context not found for permission check.');
      }
    } catch (error) {
      // ### ИЗМЕНЕНИЕ: Просто пробрасываем ошибку дальше. ###
      // Если сервис бросил Forbidden или NotFound, пусть они дойдут до GlobalExceptionFilter как есть.
      throw error;
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