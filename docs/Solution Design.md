# Solution Design: "Mutabor"

## 1. Цель

Создать интеллектуальный таск-менеджер "Mutabor" в формате веб-приложения. Продукт предназначен для небольших команд (2-15 человек), которым нужен простой инструмент для визуализации рабочих процессов на Kanban-доске и эффективной совместной работы.

## 2. Ключевые особенности и УТП

### 2.1. Классический Kanban
- **Проекты (Доски):** Пространства для организации задач.
- **Колонки (Статусы):** Настраиваемые этапы рабочего процесса.
- **Задачи (Карточки):** Атомарные рабочие элементы с настраиваемыми типами.

### 2.2. Функции для совместной работы
- **Ролевая модель:** `owner` (владелец, полный доступ), `editor` (участник, может управлять задачами и комментариями), `viewer` (только просмотр, в будущем).
- **Назначение исполнителей:** У каждой задачи может быть один ответственный.
- **Комментарии и @упоминания:** Обсуждение задач с real-time уведомлениями.

### 2.3. УТП: AI-ассистент "Mutabor AI"
- **Умная декомпозиция задач:** Разбиение общей задачи на конкретные подзадачи.
- **Автоматические саммари:** Генерация краткого содержания длинных переписок.

## 3. Ограничения

- **Платформа:** Веб-приложение.
- **Производительность:** Отклик интерфейса < 200 мс, загрузка доски < 2 сек.
- **Надежность:** Uptime сервиса — 99.8%. Данные не должны теряться.
- **Зависимость от AI:** Предусмотрена корректная работа приложения при недоступности AI-сервиса.

## 4. Ожидаемый результат

- **Функциональное веб-приложение** с базовым Kanban-функционалом и ролевой моделью.
- **Интеграционный модуль** для взаимодействия с внешними AI-провайдерами.
- **Четкий, версионированный RESTful API (`/api/v1`)** с документацией (Swagger).
- **Real-time обновления** интерфейса через WebSockets.

## 5. Архитектура и Технологии

- **Frontend:** React.
- **Backend:** Nest.js.
- **База данных:** PostgreSQL (миграции через Liquibase).
- **Real-time:** Socket.IO.

## 6. Ключевые сущности данных (Data Model)

Эта диаграмма является визуальным представлением финальной структуры базы данных, основанной на `Database Schema.md`.

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

## 7. Основные флоу (User & System Flows)

### Флоу 1: Создание задачи (с проверкой прав)
1.  **Пользователь (`editor` или `owner`)** кликает "Добавить задачу" в колонке.
2.  **Frontend** отправляет `POST /api/v1/projects/{projectId}/tasks` запрос.
3.  **Backend** (`PoliciesGuard`) проверяет, имеет ли пользователь право `CanEditProjectContent`.
4.  Если да, **Backend** создает задачу в БД.
5.  **Backend** через WebSocket рассылает событие `task:created` всем участникам проекта.

### Флоу 2: Изменение настроек проекта
1.  **Пользователь (`owner`)** пытается изменить название проекта.
2.  **Frontend** отправляет `PUT /api/v1/projects/{id}/settings`.
3.  **Backend** (`PoliciesGuard`) проверяет право `CanManageProjectSettings`.
4.  **Пользователь (`editor`)** пытается сделать то же самое. `PoliciesGuard` отклоняет запрос с ошибкой 403 Forbidden.
