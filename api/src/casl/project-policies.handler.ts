// api/src/casl/project-policies.handler.ts
import { IPolicyHandler, PolicyHandlerContext } from './policy.interface';
import { Role } from './roles.enum';

export class CanEditProjectContentPolicy implements IPolicyHandler {
  handle(context: PolicyHandlerContext): boolean {
    return context.role === Role.Owner || context.role === Role.Editor;
  }
}

export class CanManageProjectSettingsPolicy implements IPolicyHandler {
  handle(context: PolicyHandlerContext): boolean {
    return context.role === Role.Owner;
  }
}