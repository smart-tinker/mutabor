# Database Schema: Mutabor

Note: This project uses PostgreSQL, managed via Docker, as the database platform. The underlying database is PostgreSQL, so the schema definitions and ERD remain accurate.

## 1. ERD (Entity-Relationship Diagram)

Эта диаграмма является визуальным представлением финальной структуры базы данных, связей и ключевых ограничений целостности данных.

```mermaid
erDiagram
    USER {
        string id PK
        string email UK
        string name nullable
        string password_hash
        datetime created_at
        datetime updatedAt
    }

    PROJECT {
        int id PK "autoincrement"
        string name "index"
        string taskPrefix UK
        int lastTaskNumber
        string owner_id FK "ON DELETE RESTRICT"
        datetime created_at
        datetime updatedAt
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
        integer position
        int projectId FK "ON DELETE CASCADE"
        string column_id FK "ON DELETE CASCADE"
        string assignee_id FK "nullable, ON DELETE SET NULL, index"
        string creatorId FK "FK to User"
        datetime due_date "nullable"
        datetime createdAt
        datetime updatedAt
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
| **USER**                   |                    |                                                   | Пользователи системы.                                                     |
| `id`                       | `string` (UUID)    | `PRIMARY KEY`                                     | Уникальный ID пользователя.                |
| `email`                    | `string`           | `UNIQUE`, `NOT NULL`                              | Электронная почта пользователя.                                           |
| `name`                     | `string?`          | `NULLABLE`                                        | Имя пользователя.                                                         |
| `password_hash`            | `string`           | `NOT NULL`                                        | Хеш пароля пользователя.                                                  |
| `createdAt`                | `DateTime`         | `DEFAULT now()`                                   | Время создания.                                                          |
| `updatedAt`                | `DateTime`         | `updatedAt`                                       | Время последнего обновления.                                              |
| **PROJECT**                |                    |                                                   | Проекты или Kanban-доски.                                                 |
| `id`                       | `Int`              | `PRIMARY KEY`, `AUTO_INCREMENT`                   | Уникальный числовой ID проекта. Используется в URL.                       |
| `taskPrefix`               | `string`           | `UNIQUE`, `NOT NULL`                              | Короткий префикс для задач проекта (например, "PHX").                     |
| `lastTaskNumber`           | `Int`              | `DEFAULT 0`                                       | Счетчик последнего номера задачи в проекте.                               |
| `owner_id`                 | `string` (UUID)    | `FK to USER(id)`, `ON DELETE RESTRICT`            | Владелец проекта. Удаление пользователя-владельца запрещено.              |
| `createdAt`                | `DateTime`         | `DEFAULT now()`                                   | Время создания.                                                          |
| `updatedAt`                | `DateTime`         | `updatedAt`                                       | Время последнего обновления.                                              |
| **TASK**                   |                    |                                                   | Атомарные задачи.                                                         |
| `id`                       | `string` (UUID)    | `PRIMARY KEY`                                     | Внутренний, невидимый пользователю ID.                                    |
| `humanReadableId`          | `string`           | `UNIQUE`                                          | Человеко-понятный ID (например, "PHX-1"). Используется в URL.             |
| `taskNumber`               | `Int`              | `UNIQUE(projectId, taskNumber)`                   | Номер задачи, уникальный в рамках проекта.                                |
| `title`                    | `string`           | `NOT NULL`                                        | Заголовок задачи.                                                         |
| `description`              | `string?`          | `NULLABLE`                                        | Описание задачи.                                                          |
| `position`                 | `Int`              | `NOT NULL`                                        | Позиция задачи в колонке (для сортировки).                                |
| `projectId`                | `Int`              | `FK to PROJECT(id)`, `ON DELETE CASCADE`          | Связь с проектом для генерации ID и каскадного удаления.                  |
| `columnId`                 | `string` (UUID)    | `FK to COLUMN(id)`, `ON DELETE CASCADE`           | Связь с колонкой.                                                         |
| `assignee_id`              | `string?` (UUID)   | `FK to USER(id)`, `ON DELETE SET NULL`            | Исполнитель. При удалении пользователя становится `NULL`.                 |
| `creatorId`                | `string` (UUID)    | `FK to USER(id)`, `ON DELETE RESTRICT`            | Создатель задачи.                                                         |
| `dueDate`                  | `DateTime?`        | `NULLABLE`                                        | Срок выполнения задачи.                                                   |
| `createdAt`                | `DateTime`         | `DEFAULT now()`                                   | Время создания.                                                          |
| `updatedAt`                | `DateTime`         | `updatedAt`                                       | Время последнего обновления.                                              |
| **COMMENT**                |                    |                                                   | Комментарии к задачам.                                                    |
| `id`                       | `string` (UUID)    | `PRIMARY KEY`                                     | Уникальный ID комментария.                                                |
| `text`                     | `string`           | `NOT NULL`                                        | Текст комментария.                                                        |
| `taskId`                   | `string` (UUID)    | `FK to TASK(id)`, `ON DELETE CASCADE`             | Связь с задачей.                                                          |
| `authorId`                 | `string?` (UUID)   | `FK to USER(id)`, `ON DELETE SET NULL`          | Автор. При удалении пользователя становится NULL (анонимизируется).      |
| `createdAt`                | `DateTime`         | `DEFAULT now()`                                   | Время создания.                                                          |
| `updatedAt`                | `DateTime`         | `updatedAt`                                       | Время последнего обновления.                                              |
| **NOTIFICATION**           |                    |                                                   | Уведомления для пользователей.                                            |
| `id`                       | `string` (UUID)    | `PRIMARY KEY`                                     | Уникальный ID уведомления.                                                |
| `text`                     | `string`           | `NOT NULL`                                        | Содержание уведомления.                                                   |
| `isRead`                   | `boolean`          | `DEFAULT false`                                   | Статус прочтения уведомления.                                             |
| `recipientId`              | `string` (UUID)    | `FK to USER(id)`, `ON DELETE CASCADE`             | Получатель уведомления.                                                    |
| `sourceUrl`                | `string?`          | `NULLABLE`                                        | Опциональная ссылка для перехода к источнику уведомления.                  |
| `taskId`                   | `string?` (UUID)   | `FK to TASK(id)`, `ON DELETE CASCADE`, `NULLABLE` | Опциональная ссылка на связанную задачу.                                   |
| `createdAt`                | `DateTime`         | `DEFAULT now()`                                   | Время создания.                                                          |
| `updatedAt`                | `DateTime`         | `updatedAt`                                       | Время последнего обновления.                                              |