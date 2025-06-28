import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY, PolicyHandler } from './check-policies.decorator';
import { IPolicyHandler, PolicyContext } from './policy.interface';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { UserRecord } from '../types/db-records';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private projectsService: ProjectsService,
    private tasksService: TasksService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers = this.reflector.get<PolicyHandler[]>(CHECK_POLICIES_KEY, context.getHandler()) || [];
    if (!policyHandlers.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserRecord;
    if (!user) throw new ForbiddenException('User not found in request.');

    // ### ИЗМЕНЕНИЕ: Логика стала проще и надежнее ###
    // Мы ищем projectId или taskId в параметрах URL.
    const params = request.params;
    const projectId = params.projectId ? parseInt(params.projectId, 10) : (params.id ? parseInt(params.id, 10) : undefined);
    const taskId = params.taskId || (params.id && isNaN(projectId) ? params.id : undefined);

    let policyContext: PolicyContext;

    if (taskId) {
      // Контекст задачи - самый специфичный.
      const task = await this.tasksService.findTaskForPolicyCheck(taskId);
      if (!task) throw new NotFoundException('Resource not found.');
      const { project, userRole } = await this.projectsService.getProjectAndRole(task.project_id, user.id);
      policyContext = { user, project: { ...project, userRole }, task };
    } else if (projectId) {
      // Контекст проекта.
      const { project, userRole } = await this.projectsService.getProjectAndRole(projectId, user.id);
      policyContext = { user, project: { ...project, userRole } };
    } else {
      throw new ForbiddenException('Cannot determine policy context from URL.');
    }

    const allowed = policyHandlers
      .map(handler => new handler())
      .every(handler => handler.handle(policyContext));

    if (!allowed) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    
    return true;
  }
}