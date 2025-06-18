# Database Schema: Mutabor

## 1. ERD (Entity-Relationship Diagram)

Эта диаграмма является визуальным представлением финальной структуры базы данных, связей и ключевых ограничений целостности данных.

```mermaid
erDiagram
    USER {
        string id PK
        string email UK
        string name
        datetime created_at
    }

    PROJECT {
        int id PK "autoincrement"
        string name "index"
        string taskPrefix UK
        int lastTaskNumber
        string owner_id FK "ON DELETE RESTRICT"
        datetime created_at
    }

    PROJECT_MEMBER {
        int project_id PK, FK
        string user_id PK, FK
        string role
    }

    "COLUMN" {
        string id PK
        string name "UK(name, project_id)"
        integer position
        int project_id FK "ON DELETE CASCADE"
    }

    TASK {
        string id PK "uuid"
        string humanReadableId UK
        int taskNumber "UK(projectId, taskNumber)"
        string title
        int projectId FK "ON DELETE CASCADE"
        string column_id FK "ON DELETE CASCADE"
        string assignee_id FK "nullable, ON DELETE SET NULL, index"
        datetime due_date "nullable"
    }

    COMMENT {
        string id PK
        string text
        string task_id FK "ON DELETE CASCADE"
        string author_id FK "nullable, ON DELETE SET NULL"
    }
    
    NOTIFICATION {
        string id PK
        string text
        string source_url
        boolean is_read
        string recipientId FK "ON DELETE CASCADE"
    }

    USER ||--o{ PROJECT : "владеет"
    USER ||..o{ TASK : "является_исполнителем"
    USER ||--o{ COMMENT : "является_автором"
    USER }o--o{ PROJECT_MEMBER : "участвует_в"
    USER ||--o{ NOTIFICATION : "получает"
    PROJECT }o--o{ PROJECT_MEMBER : "имеет_участника"
    PROJECT ||--o{ "COLUMN" : "содержит"
    PROJECT ||--o{ TASK : "содержит"
    "COLUMN" ||--o{ TASK : "находится_в"
    TASK ||--o{ COMMENT : "имеет"
```

## 2. Описание таблиц и правил

| Таблица / Поле             | Тип данных         | Ограничения                                       | Описание                                                                  |
| -------------------------- | ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------- |
| **PROJECT**                |                    |                                                   | Проекты или Kanban-доски.                                                 |
| `id`                       | `Int`              | `PRIMARY KEY`, `AUTO_INCREMENT`                   | Уникальный числовой ID проекта. Используется в URL.                       |
| `taskPrefix`               | `string`           | `UNIQUE`, `NOT NULL`                              | Короткий префикс для задач проекта (например, "PHX").                     |
| `lastTaskNumber`           | `Int`              | `DEFAULT 0`                                       | Счетчик последнего номера задачи в проекте.                               |
| `owner_id`                 | `string` (UUID)    | `FK to USER(id)`, `ON DELETE RESTRICT`            | Владелец проекта. Удаление пользователя-владельца запрещено.              |
| **TASK**                   |                    |                                                   | Атомарные задачи.                                                         |
| `id`                       | `string` (UUID)    | `PRIMARY KEY`                                     | Внутренний, невидимый пользователю ID.                                    |
| `humanReadableId`          | `string`           | `UNIQUE`                                          | Человеко-понятный ID (например, "PHX-1"). Используется в URL.             |
| `(projectId, taskNumber)`  | `(Int, Int)`       | `UNIQUE`                                          | Номер задачи уникален в рамках одного проекта.                             |
| `projectId`                | `Int`              | `FK to PROJECT(id)`, `ON DELETE CASCADE`          | Связь с проектом для генерации ID и каскадного удаления.                  |
| `assignee_id`              | `string` (UUID)    | `FK to USER(id)`, `ON DELETE SET NULL`, `NULLABLE` | Исполнитель. При удалении пользователя становится `NULL`.                 |
| **COMMENT**                |                    |                                                   | Комментарии к задачам.                                                    |
| `author_id`                | `string` (UUID)    | `FK to USER(id)`, `ON DELETE SET NULL`, `NULLABLE` | Автор. При удалении пользователя становится `NULL` (анонимизируется).      |
| **NOTIFICATION**           |                    |                                                   | Уведомления для пользователей.                                            |
| `recipientId`              | `string` (UUID)    | `FK to USER(id)`, `ON DELETE CASCADE`             | Получатель. При удалении пользователя его уведомления удаляются.          |