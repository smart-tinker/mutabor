// api/src/casl/policies.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';
import { PolicyHandlerClass } from './policy.interface';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { Role } from './roles.enum';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private projectsService: ProjectsService,
    private tasksService: TasksService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new InternalServerErrorException('PoliciesGuard used without a valid user context. Ensure JwtAuthGuard runs first.');
    }
    
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

    try {
      // ### НОВОЕ: Добавлена логика для обработки human-readable ID (:hid) ###
      if (params.hid) {
          const projectId = await this.tasksService.getProjectIdByHumanId(params.hid);
          userRole = await this.projectsService.getUserRoleForProject(projectId, user.id);
      } else if (params.taskId || (params.id && request.path.includes('/tasks/'))) {
          const taskId = params.taskId || params.id;
          userRole = await this.tasksService.getUserRoleForTask(taskId, user.id);
      } else if (params.projectId || params.id) {
          const projectId = parseInt(params.projectId || params.id, 10);
          if (isNaN(projectId)) throw new NotFoundException('Invalid Project ID format.');
          userRole = await this.projectsService.getUserRoleForProject(projectId, user.id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ForbiddenException('You do not have permission to access this resource.');
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