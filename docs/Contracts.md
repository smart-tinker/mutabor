# Contracts: Mutabor

Этот документ является единым источником истины для всех взаимодействий внутри и снаружи системы. Он определяет форматы данных (DTO), интерфейсы сервисов и публичный API.

## 1. API Contract (OpenAPI / Swagger)

-   **Назначение:** Формальный договор между Frontend и Backend.
-   **Расположение:** Генерируется автоматически и доступен по адресу `/api-docs` после запуска бэкенда.

---

## 2. Data Contracts (Data Transfer Objects - DTO)

**Назначение:** Гарантируют, что данные, пересекающие границы слоев, имеют строгую и предсказуемую структуру.

### Project DTOs
```typescript
// DTO для создания проекта
export class CreateProjectDto {
  name: string;
  prefix: string; // Уникальный префикс для задач (uppercase, alphanumeric)
}

// DTO для добавления участника в проект
export class AddMemberDto {
  email: string;
  role: string; // e.g., 'editor', 'viewer'
}

// DTO для обновления настроек проекта
export class UpdateProjectSettingsDto {
  name?: string; // Optional new name of the project
  prefix?: string; // Optional new unique prefix for tasks (uppercase, alphanumeric, 2-10 chars)
  statuses?: string[]; // Optional new list of task statuses
  types?: string[]; // Optional new list of task types
}
```

### Task & Comment DTOs
```typescript
// DTO для создания задачи
export class CreateTaskDto {
  title: string;
  description?: string;
  columnId: string;
  projectId: number;
  assigneeId?: string;
  dueDate?: string; // ISO Date String
  type?: string;
  priority?: string;
  tags?: string[];
}

// DTO для обновления задачи
export class UpdateTaskDto {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  type?: string | null;
  priority?: string | null;
  tags?: string[] | null;
}

// DTO для перемещения задачи
export class MoveTaskDto {
  newColumnId: string;
  newPosition: number;
}

// DTO для создания комментария
export class CreateCommentDto {
  text: string;
}
```

### User DTOs
```typescript
// DTO для регистрации
export class RegisterUserDto {
  name: string;
  email: string;
  password: string; // min 8 characters
}

// DTO для логина
export class LoginUserDto {
  email: string;
  password: string;
}
```

### Notification DTO
```typescript
// DTO для уведомления, возвращаемый клиенту
export class NotificationDto {
  id: string;
  text: string;
  isRead: boolean;
  sourceUrl?: string | null;
  taskId?: string | null;
  createdAt: Date;
}
```