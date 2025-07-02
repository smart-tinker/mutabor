# Database Schema: Mutabor

Note: This project uses PostgreSQL, managed via Docker, as the database platform. The schema is managed via Liquibase migrations defined in `api/db/changelog/`.

## 1. ERD (Entity-Relationship Diagram)

Эта диаграмма является визуальным представлением финальной структуры базы данных, связей и ключевых ограничений целостности данных.

```mermaid
erDiagram
    users {
        string id PK
        string email UK
        string name nullable
        string password_hash
        string role "NOT NULL, DEFAULT 'user'"
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

## 2. Описание таблиц и правил

| Таблица / Поле             | Тип данных         | Ограничения / Индексы                               | Описание                                                                  |
| -------------------------- | ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------- |
| **users**                  |                    |                                                     | Пользователи системы.                                                     |
| `id`                       | `string` (UUID)    | `PRIMARY KEY`                                       | Уникальный ID пользователя.                                               |
| `email`                    | `string`           | `UNIQUE`, `NOT NULL`                                | Электронная почта.                                                        |
| `name`                     | `string?`          | `NULLABLE`                                          | Имя пользователя.                                                         |
| `password_hash`            | `string`           | `NOT NULL`                                          | Хеш пароля.                                                               |
| `role`                     | `string`           | `NOT NULL`, `DEFAULT 'user'`, `INDEX`               | Глобальная роль пользователя (например, 'admin', 'user').                 |
| **projects**               |                    |                                                     | Проекты или Kanban-доски.                                                 |
| `id`                       | `Int`              | `PRIMARY KEY`, `SERIAL`                             | Уникальный числовой ID проекта.                                           |
| `task_prefix`              | `string`           | `UNIQUE`, `NOT NULL`                                | Короткий префикс для задач проекта (например, "PHX").                     |
| `last_task_number`         | `Int`              | `DEFAULT 0`                                         | Счетчик последнего номера задачи в проекте.                               |
| `owner_id`                 | `string` (UUID)    | `FK to users(id)`, `ON DELETE RESTRICT`             | Владелец проекта.                                                         |
| **project_members**        |                    |                                                     | Связующая таблица для участников проекта.                                  |
| `project_id`               | `Int`              | `PK`, `FK to projects(id)`, `ON DELETE CASCADE`      | ID проекта.                                                             |
| `user_id`                  | `string` (UUID)    | `PK`, `FK to users(id)`, `ON DELETE CASCADE`, `INDEX` | ID пользователя.                                                          |
| `role`                     | `string`           | `NOT NULL`                                          | Роль пользователя в проекте.                                              |
| **project_task_types**     |                    |                                                     | Справочник кастомных типов задач для проекта.                               |
| `id`                       | `Int`              | `PRIMARY KEY`, `SERIAL`                             | ID типа задачи.                                                           |
| `name`                     | `string`           | `UK (name, project_id)`                             | Название типа (e.g., Bug, Feature).                                       |
| `project_id`               | `Int`              | `FK to projects(id)`, `ON DELETE CASCADE`           | Связь с проектом.                                                         |
| **columns**                |                    |                                                     | Колонки на Kanban-доске (они же статусы задач).                             |
| `id`                       | `string` (UUID)    | `PRIMARY KEY`                                       | Уникальный ID колонки.                                                    |
| `name`                     | `string`           | `UK (name, project_id)`                             | Название колонки, уникальное в рамках проекта.                            |
| `position`                 | `Int`              | `NOT NULL`                                          | Порядковый номер для сортировки.                                          |
| `project_id`               | `Int`              | `FK to projects(id)`, `ON DELETE CASCADE`           | Связь с проектом.                                                         |
| **tasks**                  |                    |                                                     | Атомарные задачи.                                                         |
| `id`                       | `string` (UUID)    | `PRIMARY KEY`                                       | Внутренний ID.                                                          |
| `human_readable_id`        | `string`           | `UNIQUE`                                            | Человеко-понятный ID (например, "PHX-1").                                 |
| `task_number`              | `Int`              | `UK(project_id, task_number)`                       | Номер задачи, уникальный в рамках проекта.                                |
| `type`                     | `string?`          | `NULLABLE`                                          | Тип задачи (e.g., Bug, Feature). Валидируется по таблице `project_task_types`. |
| `column_id`                | `string` (UUID)    | `FK to columns(id)`, `ON DELETE CASCADE`, `INDEX`     | Связь с колонкой.                                                         |
| `assignee_id`              | `string?` (UUID)   | `FK to users(id)`, `ON DELETE SET NULL`, `INDEX`      | Исполнитель.                                                              |
| **comments**               |                    |                                                     | Комментарии к задачам.                                                    |
| `id`                       | `string` (UUID)    | `PRIMARY KEY`                                       | Уникальный ID комментария.                                                |
| `author_id`                | `string?` (UUID)   | `FK to users(id)`, `ON DELETE SET NULL`             | Автор. При удалении становится NULL.                                     |
| **notifications**          |                    |                                                     | Уведомления для пользователей.                                            |
| `id`                       | `string` (UUID)    | `PRIMARY KEY`                                       | Уникальный ID уведомления.                                                |
| `recipient_id`             | `string` (UUID)    | `FK to users(id)`, `ON DELETE CASCADE`, `INDEX`       | Получатель уведомления.                                                   |
| `task_id`                  | `string?` (UUID)   | `FK to tasks(id)`, `ON DELETE CASCADE`, `NULLABLE`  | Опциональная ссылка на связанную задачу.                                   |
