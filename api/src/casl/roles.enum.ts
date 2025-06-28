// Этот enum определяет все возможные роли в проекте.
export enum Role {
    Owner = 'owner',
    Editor = 'editor',
    Viewer = 'viewer', // Добавим для будущего использования
}
```

**`api/src/casl/policy.interface.ts`**
```typescript
import { UserRecord, ProjectRecord, TaskRecord } from '../types/db-records';

// Определяет, какие данные доступны для проверки политики.
// Мы передаем сюда пользователя, проект и, возможно, задачу.
export interface PolicyContext {
  user: UserRecord;
  project: ProjectRecord & { userRole: Role }; // Добавляем роль пользователя в проект
  task?: TaskRecord;
}

// Интерфейс для обработчика политики.
export interface IPolicyHandler {
  handle(context: PolicyContext): boolean;
}

// Тип для конструктора обработчика политики.
export type PolicyHandler = new () => IPolicyHandler;