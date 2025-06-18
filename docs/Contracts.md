# Contracts: Mutabor

Этот документ является единым источником истины для всех взаимодействий внутри и снаружи системы. Он определяет форматы данных (DTO), интерфейсы сервисов и публичный API.

## 1. API Contract (OpenAPI / Swagger)

**Назначение:** Формальный договор между Frontend и Backend.
-   **Расположение:** Генерируется автоматически и доступен по адресу `/api-docs`.

---

## 2. Internal Service Contracts (TypeScript Interfaces)

**Назначение:** Обеспечивают слабую связанность между модулями бэкенда.

### `IProjectsService.ts`
```typescript
export interface IProjectsService {
  create(dto: CreateProjectDto, ownerId: string): Promise<Project>;
  findAllForUser(ownerId: string): Promise<Project[]>;
  findOneById(id: number): Promise<ProjectWithBoard>; // ProjectWithBoard - кастомный тип с доской
  addMember(projectId: number, dto: AddMemberDto, currentUserId: string): Promise<ProjectMember>;
}
```

### `ITasksService.ts`
```typescript
export interface ITasksService {
  create(dto: CreateTaskDto): Promise<Task>;
  findOneByHumanId(humanId: string): Promise<TaskWithDetails>; // TaskWithDetails - с комментариями и т.д.
  move(taskId: string, dto: MoveTaskDto): Promise<void>;
  addComment(taskId: string, dto: CreateCommentDto, author: User): Promise<Comment>;
}
```

---

## 3. Data Contracts (Data Transfer Objects - DTO)

**Назначение:** Гарантируют, что данные, пересекающие границы слоев, имеют строгую и предсказуемую структуру.

### Generic DTOs
-   `PaginatedResponseDTO<T>`
-   `ErrorResponseDTO`

### User DTOs
-   `UserSummaryDTO`
-   `UserProfileDTO`
-   `UpdateUserDTO`

### Project DTOs
```typescript
// DTO для создания проекта
export class CreateProjectDto {
  name: string;
  prefix: string; // Уникальный префикс для задач
}

// DTO для добавления участника в проект
export class AddMemberDto {
  email: string;
  role: string; // e.g., 'editor', 'viewer'
}
```

### Task & Comment DTOs
```typescript
// DTO для создания задачи
export class CreateTaskDto {
  title: string;
  description?: string;
  columnId: string;
  assigneeId?: string;
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