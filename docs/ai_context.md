# Архитектурный Дайджест "Mutabor"

## 1. Правила ведения проекта и дайджеста

### Правила проекта
-   **Система контроля версий:** GitHub Flow. `main` — стабильна.
-   **Формат коммитов:** Conventional Commits (`feat(scope): subject`).
-   **Архитектура Backend:** Модульный монолит (Nest.js) с разделением на слои.
-   **Архитектура Frontend:** Feature-Sliced Design (FSD).

### Правила этого дайджеста
-   **Назначение:** Предоставить самодостаточную сводку о текущем архитектурном состоянии проекта для AI-ассистента.
-   **Принцип:** **Интерфейсы важнее реализации.** Включаются только публичные API, DTO и ERD.
-   **Запрос файлов:** Если для решения задачи требуется полная реализация файла (тело метода), AI-ассистент должен запросить его по полному пути.
-   **Обновление:** Этот файл должен обновляться в конце каждой рабочей сессии для фиксации прогресса.

---

## 2. Ключевые архитектурные контракты

### 2.1. Контракты данных (DTO)
<pre>
<code>
// DTO для создания проекта
export class CreateProjectDto {
  name: string;
  prefix: string; // Уникальный префикс для задач (uppercase, alphanumeric)
}

// DTO для добавления участника в проект
export class AddMemberDto {
  email: string;
  role: 'editor' | 'viewer';
}

// DTO для обновления настроек проекта
export class UpdateProjectSettingsDto {
  name?: string;
  prefix?: string;
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

// DTO для создания задачи
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
</code>
</pre>

### 2.2. Схема Базы Данных (ERD)
<pre>
<code>
```mermaid
erDiagram
    users {
        string id PK
        string email UK
        string name nullable
        string password_hash
        datetime created_at
        datetime updated_at
    }

    projects {
        int id PK "SERIAL"
        string name
        string task_prefix UK
        int last_task_number
        string owner_id FK
        datetime created_at
        datetime updated_at
    }

    project_members {
        int project_id PK, FK
        string user_id PK, FK
        string role
    }

    project_task_types {
        int id PK "SERIAL"
        string name "UK(name, project_id)"
        string color nullable
        int project_id FK
    }

    columns {
        string id PK "UUID"
        string name "UK(name, project_id)"
        int position
        int project_id FK
    }

    tasks {
        string id PK "UUID"
        string human_readable_id UK
        int task_number "UK(project_id, task_number)"
        string title
        string description nullable
        int position
        string type nullable
        string priority nullable
        string_array tags nullable
        int project_id FK
        string column_id FK
        string assignee_id FK "nullable"
        string creator_id FK
        datetime due_date "nullable"
        datetime created_at
        datetime updated_at
    }

    comments {
        string id PK "UUID"
        string text
        string task_id FK
        string author_id FK "nullable"
        datetime created_at
        datetime updated_at
    }
    
    notifications {
        string id PK "UUID"
        string recipient_id FK
        string text
        boolean is_read
        string source_url nullable
        string task_id FK "nullable"
        datetime created_at
        datetime updated_at
    }

    users ||--o{ projects : "владеет"
    users }o--o{ project_members : "участвует_в"
    users ||--o{ tasks : "создатель"
    users ||..o{ tasks : "исполнитель"
    users ||--o{ comments : "автор"
    users ||--o{ notifications : "получатель"
    
    projects }o--o{ project_members : "имеет_участников"
    projects ||--o{ columns : "содержит"
    projects ||--o{ tasks : "содержит"
    projects ||--o{ project_task_types : "определяет"
    
    columns ||--o{ tasks : "содержит"
    
    tasks ||--o{ comments : "имеет"
    tasks ||..o{ notifications : "связана_с"
```
</code>
</pre>

---
## 3. Структура проекта

```
.
├── api/                      # Backend (Nest.js)
│   ├── db/changelog/
│   │   ├── db.changelog-master.xml   # Главный файл миграций Liquibase
│   │   └── db.changelog-initial.xml  # Единый файл со всей схемой БД
│   ├── src/
│   │   ├── ai/               # Модуль интеграции с AI (УТП)
│   │   ├── auth/             # Модуль аутентификации и управления профилем
│   │   ├── casl/             # Модуль авторизации (управление доступом)
│   │   ├── events/           # Модуль Real-time коммуникаций
│   │   ├── projects/         # Модуль управления проектами, колонками, участниками
│   │   ├── tasks/            # Модуль управления задачами и комментариями
│   │   ├── types/
│   │   │   └── db-records.d.ts # TypeScript-типы для записей из БД
│   │   └── app.module.ts     # Корневой модуль, сборка приложения
│   └── package.json          # Зависимости и скрипты бэкенда
└── docs/                     # Папка с полной документацией для разработчиков
    ├── Contracts.md
    └── Database Schema.md
```

---
## 4. Выжимка из ключевых файлов кода

<pre>
# Эта секция будет заполнена по мере необходимости,
# когда мы будем работать с конкретными файлами кода.
# Пример:
#
# ### `api/src/projects/projects.controller.ts` (Только сигнатуры эндпоинтов)
# 
# @Controller('projects')
# export class ProjectsController {
#   @Post()
#   create(...) { /*...*/ }
# 
#   @Get(':id')
#   findOne(...) { /*...*/ }
# }
</pre>
