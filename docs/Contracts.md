# Contracts: Mutabor

Этот документ является единым источником истины для всех взаимодействий внутри и снаружи системы. Он определяет форматы данных (DTO), интерфейсы сервисов и публичный API.

## 1. API Contract (OpenAPI / Swagger)

-   **Назначение:** Формальный договор между Frontend и Backend.
-   **Расположение:** Генерируется автоматически и доступен по адресу `/api/v1/api-docs` после запуска бэкенда.
-   **Версионирование:** API использует версионирование через URL. Текущая версия: `v1`. Все эндпоинты доступны по префиксу `/api/v1`.

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
  role: 'editor' | 'viewer'; // Владелец назначается при создании проекта
}

// DTO для обновления настроек проекта
export class UpdateProjectSettingsDto {
  name?: string;
  prefix?: string;
  // Полный список колонок (статусов). Бэкенд обновит их имена и порядок.
  statuses?: string[];
  // Полный список типов задач. Бэкенд синхронизирует таблицу `project_task_types` с этим списком.
  types?: string[];
}

// DTO для создания колонки
export class CreateColumnDto {
  name: string;
}

// DTO для обновления одной колонки
export class UpdateColumnDto {
  name: string;
}

// DTO с полной информацией о проекте, возвращаемый клиенту
export class ProjectDetailsDto {
  id: number;
  name: string;
  prefix: string;
  owner: { id: string; name: string; email: string; };
  members: { id: string; name: string; email: string; role: string; }[];
  columns: { id: string; name: string; position: number; tasks: TaskDto[] }[];
  availableTaskTypes: string[];
}
```

### Task & Comment DTOs
```typescript
// DTO для создания задачи. projectId передается через URL: POST /projects/{projectId}/tasks
export class CreateTaskDto {
  title: string;
  description?: string;
  columnId: string;
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

### User & Profile DTOs
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

// DTO для обновления профиля
export class UpdateProfileDto {
    name?: string;
}

// DTO для смены пароля
export class ChangePasswordDto {
    oldPassword: string;
    newPassword: string; // min 8 characters
}
```

### Notification DTO
```typescript
// DTO для уведомления, возвращаемый клиенту
export class NotificationDto {
  id: string;
  recipient_id: string;
  text: string;
  isRead: boolean;
  sourceUrl?: string | null;
  taskId?: string | null;
  createdAt: Date;
}
```
