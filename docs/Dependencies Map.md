# Dependencies Map: Mutabor

## 1. Внутренние зависимости (Коммуникация между модулями)

Система строится как модульный монолит. Модули взаимодействуют через DI-контейнер Nest.js.

```mermaid
graph TD
    subgraph "Mutabor Backend (Модульный Монолит)"
        AuthService
        ProfileController
        ProjectsController
        TasksController
        NotificationsController
        
        ProjectsService
        TasksService
        CommentsService
        NotificationsService
        
        PoliciesGuard
        EventsGateway

        subgraph "CASL (Authorization)"
            PoliciesGuard -- "Проверяет права" --> ProjectsService
            PoliciesGuard -- "Проверяет права" --> TasksService
        end

        ProjectsController -- "Использует" --> ProjectsService
        TasksController -- "Использует" --> TasksService
        ProfileController -- "Использует" --> AuthService
        NotificationsController -- "Использует" --> NotificationsService

        TasksService -- "Проверяет валидность типа" --> ProjectsService
        TasksService -- "Управляет комментариями" --> CommentsService
        
        CommentsService -- "Создает уведомления" --> NotificationsService
        CommentsService -- "Отправляет события" --> EventsGateway

        NotificationsService -- "Отправляет события" --> EventsGateway
        
        ProjectsController -- "Защищен" --> PoliciesGuard
        TasksController -- "Защищен" --> PoliciesGuard
    end

    subgraph "Внешний мир"
      AI_Provider[External AI API]
      subgraph "Frontend"
        Browser
      end
    end

    Browser -- "HTTP" --> ProjectsController
    Browser -- "HTTP" --> TasksController
    Browser -- "HTTP" --> ProfileController
    Browser -- "HTTP" --> NotificationsController
    Browser -- "WebSocket" --> EventsGateway

    %% AIService -- "API-вызов" --> AI_Provider
```

- **`PoliciesGuard` (Гард Авторизации):** Центральный элемент проверки прав. Зависит от `ProjectsService` и `TasksService` для получения контекста (проекта, задачи) и определения роли пользователя.
- **`ProjectsService` / `TasksService`:** Ядра бизнес-логики. Теперь они не содержат логику проверки прав, а просто предоставляют данные для `PoliciesGuard`.
- **`CommentsService`:** Делегирует создание уведомлений об упоминаниях в `NotificationsService`.
- **`NotificationsService`:** Новый, изолированный сервис. Отвечает за создание записей об уведомлениях в БД и отправку real-time событий через `EventsGateway`.

## 2. Новые компоненты (что создано)

### Backend:
- `ProfileController`: Эндпоинты для управления профилем (`/profile/me`, `/profile/change-password`).
- `NotificationsService` & `NotificationsController`: CRUD и бизнес-логика для уведомлений.
- `PoliciesGuard`: Глобальный гвард для проверки ролевой модели доступа.
- `@CheckPolicies` & `PolicyHandler`: Декораторы и обработчики для декларативного описания правил доступа.

### Frontend (что потребуется создать):
- `ProfilePage`: Страница для редактирования имени и смены пароля.
- `NotificationBell`: Компонент с иконкой-колокольчиком, который слушает WebSocket-событие `notification:new`.
- **Обработка ошибок 403 Forbidden:** UI должен корректно реагировать, если пользователь пытается выполнить действие, на которое у него нет прав (например, скрывать кнопки "Настройки" для `editor`).
