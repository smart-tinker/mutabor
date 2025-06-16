# Contracts: Mutabor

Этот документ является **Единым Источником Истины (Single Source of Truth)** для всех взаимодействий внутри и снаружи системы. Он определяет форматы данных (DTO), интерфейсы сервисов и публичный API. Любое изменение в контрактах требует обязательного обновления этого документа. Это не опция, а закон проекта.

## 1. API Contract (OpenAPI / Swagger)

**Назначение:** Формальный, машиночитаемый договор между Frontend, Backend и любыми другими системами. Описывает все публичные эндпоинты, их HTTP-методы, параметры, а также структуры запросов и ответов.

-   **Расположение:** Генерируется автоматически фреймворком Nest.js и доступен по адресу `/api-docs` после запуска бэкенд-сервиса.
-   **Принцип:** Все, что описано в OpenAPI, является публичным обещанием. Фронтенд-разработчик может и должен полагаться на эти эндпоинты и структуры данных без необходимости заглядывать в код бэкенда.

---

## 2. Internal Service Contracts (TypeScript Interfaces)

**Назначение:** Обеспечивают слабую связанность и взаимозаменяемость модулей бэкенда. Определяют **"что"** сервис должен делать, но не **"как"**. Каждый сервис обязан реализовывать (`implements`) соответствующий интерфейс.

### `IUserService.ts`
```typescript
// DTO импортируются для обеспечения строгой типизации
import { UserProfileDTO, UserSummaryDTO, UpdateUserDTO } from '../dto/user.dto';
import { User } from '@prisma/client'; // Импорт сущности для внутреннего использования

export interface IUserService {
  /** Найти полную сущность пользователя по ID. Используется только внутри бэкенда. */
  findUserEntityById(id: string): Promise<User | null>;

  /** Получить публичный профиль пользователя. Безопасно для отображения другим пользователям. */
  getUserSummary(id: string): Promise<UserSummaryDTO | null>;

  /** Получить полный профиль для аутентифицированного пользователя. Содержит приватные данные. */
  getUserProfile(userId: string): Promise<UserProfileDTO>;

  /** Обновить профиль пользователя. */
  updateUserProfile(userId: string, data: UpdateUserDTO): Promise<UserProfileDTO>;
}
```

### `ITaskService.ts`
```typescript
import { TaskDTO, CreateTaskDTO, UpdateTaskDTO, MoveTaskDTO } from '../dto/task.dto';

export interface ITaskService {
  /** Создать новую задачу. */
  createTask(data: CreateTaskDTO, authorId: string): Promise<TaskDTO>;

  /** Получить задачу по ID. Пользователь должен иметь доступ к проекту. */
  getTaskById(taskId: string, userId: string): Promise<TaskDTO>;

  /** Обновить данные задачи (заголовок, описание, исполнитель). */
  updateTask(taskId: string, data: UpdateTaskDTO, userId: string): Promise<TaskDTO>;

  /** Переместить задачу в другую колонку или изменить ее порядок. */
  moveTask(taskId: string, data: MoveTaskDTO, userId: string): Promise<TaskDTO>;

  /** Удалить задачу. */
  deleteTask(taskId: string, userId: string): Promise<void>;
}
```

---

## 3. Data Contracts (Data Transfer Objects - DTO)

**Назначение:** Страховка от хаоса. Гарантируют, что данные, пересекающие границы слоев (Controller <-> Service, Backend <-> Frontend), имеют строгую, предсказуемую и безопасную структуру.

### Generic DTOs

```typescript
/** Контракт для любого ответа, содержащего список с пагинацией. */
export interface PaginatedResponseDTO<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

/** Контракт для любого ответа с ошибкой. */
export interface ErrorResponseDTO {
  statusCode: number;
  message: string | string[]; // Сообщение может быть массивом при ошибках валидации полей.
  error: string;
}
```

### User DTOs

```typescript
/**
 * Публичные данные о пользователе.
 * Безопасно для отображения в списках участников, комментариях, исполнителях задач.
 * НЕ ДОЛЖЕН содержать email или другую приватную информацию.
 */
export class UserSummaryDTO {
  id: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Личные данные пользователя.
 * Доступен только самому пользователю на странице его профиля/настроек.
 */
export class UserProfileDTO {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
```

### Task & Project DTOs

```typescript
/** DTO для комментария. */
export class CommentDTO {
  id: string;
  text: string;
  author: UserSummaryDTO; // Вложенный контракт, гарантирующий безопасность.
  createdAt: Date;
}

/**
 * Основной DTO для задачи.
 * Является "глубоким" объектом, чтобы минимизировать количество запросов с фронтенда.
 */
export class TaskDTO {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  position: number;
  assignee?: UserSummaryDTO; // Вложенный контракт.
  comments: CommentDTO[];    // Вложенный контракт. Задача "не живет" без комментариев.
  createdAt: Date;
  updatedAt: Date;
}

/** DTO для создания задачи. */
export class CreateTaskDTO {
  title: string;
  columnId: string;
  description?: string;
  assigneeId?: string;
}

/** DTO для обновления полей задачи. */
export class UpdateTaskDTO {
  title?: string;
  description?: string;
  assigneeId?: string | null; // null для снятия исполнителя
}

/** DTO для перемещения задачи. */
export class MoveTaskDTO {
  newColumnId: string;
  newPosition: number;
}