import { SetMetadata } from '@nestjs/common';
import { PolicyHandler } from './policy.interface';

export const CHECK_POLICIES_KEY = 'check_policy';
export const CheckPolicies = (...handlers: PolicyHandler[]) => SetMetadata(CHECK_POLICIES_KEY, handlers);
```

**`api/src/casl/project-policies.handler.ts`**
```typescript
import { IPolicyHandler, PolicyContext } from './policy.interface';
import { Role } from './roles.enum';

// Политика: может ли пользователь редактировать контент проекта (задачи, комментарии)
export class CanEditProjectContentPolicy implements IPolicyHandler {
  handle(context: PolicyContext): boolean {
    return context.project.userRole === Role.Owner || context.project.userRole === Role.Editor;
  }
}

// Политика: может ли пользователь управлять настройками проекта, участниками
export class CanManageProjectSettingsPolicy implements IPolicyHandler {
  handle(context: PolicyContext): boolean {
    return context.project.userRole === Role.Owner;
  }
}