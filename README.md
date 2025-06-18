# Mutabor: Интеллектуальный Таск-менеджер

[![CI/CD Status](https://img.shields.io/badge/CI%2FCD-passing-brightgreen)](https://github.com/your-repo/mutabor/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

"Mutabor" — это веб-приложение для управления задачами с Kanban-доской, созданное для небольших команд. Ключевая особенность — встроенный AI-ассистент, который помогает автоматизировать рутинные задачи, такие как декомпозиция и анализ.

Продукт спроектирован как платформа, позволяющая пользователям подключать свои собственные ключи к AI-провайдерам для персонализации и контроля над расходами.

## 🚀 Быстрый старт (Quick Start)

### Предварительные требования
- [Node.js](https://nodejs.org/) (v18.x или выше)
- [Docker](https://www.docker.com/) и [Docker Compose](https://docs.docker.com/compose/)

### 1. Установка и запуск

```bash
# Клонировать репозиторий
git clone https://github.com/your-repo/mutabor.git
cd mutabor

# Установить все зависимости (для API и Client)
npm install

# Создать .env файл для бэкенда в директории `api/`.
# Необходимо указать как минимум `DATABASE_URL` и `JWT_SECRET`.
# Пример содержимого для `api/.env`:
# JWT_SECRET="YOUR_SUPER_SECRET_JWT_KEY"
# DATABASE_URL="postgresql://user:password@host:port/database"

# Для `DATABASE_URL`:
# 1. Рекомендуется использовать Supabase. Создайте проект на Supabase
#    и получите Connection String (URI) из настроек вашего проекта
#    (Dashboard -> Project Settings -> Database -> Connection string -> URI).
# 2. Для локальной разработки с Supabase, вы можете использовать Supabase CLI:
#    - Установите Supabase CLI (https://supabase.com/docs/guides/cli/getting-started).
#    - Запустите локальный Supabase-стек: `supabase start`.
#    - CLI выведет локальный `DATABASE_URL` (обычно что-то вроде `postgresql://postgres:postgres@localhost:54322/postgres`).
#    - Не забудьте выполнить `supabase db reset` для применения миграций из `prisma/migrations`
#      после первого запуска или изменений схемы.
# 3. Если вы предпочитаете использовать Docker для PostgreSQL, раскомментируйте
#    сервис `db` в `docker-compose.yml` и используйте соответствующий DATABASE_URL,
#    например: "postgresql://user:password@db:5432/mutabor?schema=public".

# Запустить сервисы:
# Если вы используете Supabase (облачный или через CLI), вы можете закомментировать
# сервис `db` в `docker-compose.yml` для экономии ресурсов.
docker-compose up --build
```

- **Backend API** будет доступен по адресу: `http://localhost:3001` (если запущен через Docker или `npm run dev` в `api/`)
- **Frontend App** будет доступен по адресу: `http://localhost:3000` (если запущен через Docker или `npm run dev` в `client/`)

### 2. Конфигурация окружения

Ключевые переменные окружения для `api/.env`:

```env
# Секретный ключ для подписи JWT-токенов.
# Критически важен для безопасности. Используйте длинную, случайную строку.
JWT_SECRET="YOUR_SUPER_SECRET_JWT_KEY_THAT_NOBODY_KNOWS"

# Строка подключения к базе данных Supabase (или другому PostgreSQL инстансу).
# Пример для Supabase: "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-SUPABASE-PROJECT-ID].supabase.co:5432/postgres"
# Пример для локального Supabase CLI: "postgresql://postgres:postgres@localhost:54322/postgres"
# Пример для Docker: "postgresql://user:password@db:5432/mutabor?schema=public"
DATABASE_URL="YOUR_DATABASE_CONNECTION_STRING"
```

## 🚀 Развертывание на Vercel (Deploying to Vercel)

Это приложение можно легко развернуть с использованием Vercel. Проект является монорепозиторием, поэтому вам, скорее всего, потребуется настроить два отдельных проекта в Vercel: один для Frontend (`/client`) и один для Backend (`/api`).

### Общие шаги для каждого проекта Vercel (Client и API):

1.  **Подключение к GitHub:**
    *   Зарегистрируйтесь или войдите в [Vercel](https://vercel.com/).
    *   Создайте новый проект ("Add New... -> Project").
    *   Импортируйте ваш GitHub репозиторий, где находится "Mutabor".

2.  **Конфигурация проекта в Vercel:**
    *   **Framework Preset:**
        *   Для Frontend (`/client`): Vercel обычно автоматически определяет React (Create React App) или Next.js. Если нет, выберите соответствующий пресет.
        *   Для Backend (`/api`): Выберите "NestJS" или, если его нет, "Node.js".
    *   **Root Directory:**
        *   Для Frontend-проекта: Укажите `client`.
        *   Для Backend-проекта: Укажите `api`.
    *   **Build and Output Settings:**
        *   Vercel часто автоматически определяет корректные команды сборки и директории вывода для стандартных пресетов.
        *   Для Backend (`/api` на NestJS):
            *   Build Command: `npm run build` (или `pnpm build`, `yarn build` в зависимости от пакетного менеджера, используемого в `api/`)
            *   Output Directory: `api/dist` (или просто `dist` если Root Directory уже `api`).
            *   Install Command: `npm install` (или `pnpm install`, `yarn install`)
        *   Для Frontend (`/client` на React):
            *   Build Command: `npm run build` (или `pnpm build`, `yarn build` в `client/`)
            *   Output Directory: `client/build` (или `build` если Root Directory уже `client`).
            *   Install Command: `npm install` (или `pnpm install`, `yarn install`)
    *   **Environment Variables:**
        *   Перейдите в настройки проекта Vercel (Settings -> Environment Variables).
        *   Для Backend (`/api`):
            *   `DATABASE_URL`: Ваша строка подключения к Supabase (из дашборда Supabase). **Это критически важно.**
            *   `JWT_SECRET`: Ваш секретный ключ для JWT. Должен быть таким же, как и при локальной разработке, но более надежным для продакшена.
            *   Любые другие API-ключи или конфигурационные переменные, которые могут понадобиться вашему API (например, для внешних AI сервисов).
        *   Для Frontend (`/client`):
            *   `REACT_APP_API_URL` (или `NEXT_PUBLIC_API_URL`): Публичный URL вашего развернутого Backend API на Vercel (например, `https://your-api-project-name.vercel.app`). Это позволит вашему клиентскому приложению отправлять запросы на правильный API.

3.  **Развертывание:**
    *   После конфигурации, Vercel автоматически запустит сборку и развертывание вашего проекта.
    *   Vercel также настроит CI/CD, автоматически развертывая новые изменения при пуше в основную ветку (например, `main` или `master`).

### Важно для монорепозитория:
- Убедитесь, что команды сборки и установки (`Install Command`, `Build Command`) выполняются в контексте правильной директории (`api/` или `client/`). Если вы установили `Root Directory`, Vercel будет выполнять команды из этой директории.
- Для `npm workspaces` или `pnpm workspaces`, `Install Command` на уровне Vercel проекта (с указанным Root Directory) должен корректно установить зависимости для этого конкретного воркспейса.

После успешного развертывания у вас будут отдельные URL-адреса для вашего API и клиентского приложения.

## 🛠️ Основные команды для разработки

- `npm run dev`: Запустить frontend и backend в режиме разработки с hot-reload.
- `npm run build`: Собрать продакшн-версии приложений.
- `npm run test`: Запустить тесты (unit и интеграционные) для backend.
- `npm run lint`: Проверить код на соответствие стандартам стиля.
- `npm run db:migrate`: Применить новые миграции схемы базы данных (выполнять в `api/` директории). Убедитесь, что ваша `DATABASE_URL` в `api/.env` указывает на целевую Supabase базу данных (локальную через CLI или облачную). Для локального Supabase CLI также можно использовать `supabase db reset` для применения всех миграций.

## 🏛️ Архитектура и Ключевые особенности

Проект построен как монорепозиторий с двумя основными частями: `/api` (backend на Nest.js) и `/client` (frontend на React).

-   **Модульность:** Бэкенд строго разделен на модули (`auth`, `projects`, `tasks`, `notifications`) с четко определенными обязанностями.
-   **Строгие слои:** Архитектура следует принципам `Layer Guides`, где контроллеры "тонкие", а вся бизнес-логика находится в сервисах.
-   **Человеко-понятные ID:** Для удобства пользователей и интеграций, система использует легко читаемые идентификаторы:
    -   **Проекты:** Нумеруются по порядку (`/projects/1`, `/projects/2`).
    -   **Задачи:** Имеют уникальный префикс проекта и номер (`/tasks/PHX-1`, `/tasks/PROJ-10`).
    -   Внутренние `UUID` используются для связей в базе данных, но не выставляются наружу.
-   **Контракты:** Все взаимодействие происходит по строгим контрактам (DTO, OpenAPI), что гарантирует предсказуемость.

## 🔌 API Документация

Автоматически генерируемая интерактивная документация API (Swagger) доступна после запуска приложения по адресу:

**`http://localhost:3001/api-docs`**

Используйте её для изучения и тестирования эндпоинтов.

## 💡 Точки расширения

### 1. Добавление новой AI-функции

Это основной способ наращивания функциональности продукта.

**Пример: Добавление функции "AI-генерация тегов для задачи"**

1.  **`ai.service.ts`**: Добавьте новый метод в сервис-адаптер. Он должен принимать текст задачи и API-ключ пользователя.
    ```typescript
    // api/src/ai/ai.service.ts
    async generateTags(taskTitle: string, userApiKey: string): Promise<string[]> {
      const prompt = `Предложи 3-4 релевантных тега для задачи: "${taskTitle}".`;
      // Логика вызова внешнего AI с использованием userApiKey
    }
    ```
2.  **`tasks.controller.ts`**: Создайте новый эндпоинт.
    ```typescript
    // api/src/tasks/tasks.controller.ts
    @Post(':id/generate-tags')
    async generateTags(@Param('id') id: string, @Req() req) {
      // Получаем userApiKey из настроек пользователя (req.user.settings.apiKey)
      return this.tasksService.generateTagsForTask(id, req.user.settings.apiKey);
    }
    ```
3.  **`tasks.service.ts`**: Вызовите `AiService` и сохраните результат.

### 2. Интеграция с Git-репозиторием (Стратегическое направление)

Следующим большим шагом является привязка проектов "Mutabor" к Git-репозиториям. Это позволит AI-ассистенту работать с кодовой базой напрямую.

- **Шаг 1: Модель данных.** Расширить модель `Project`, добавив поля `gitRepoUrl` и `gitProviderToken` (зашифрованный).
- **Шаг 2: Сервис-адаптер.** Создать `GitService`, который будет инкапсулировать логику клонирования репозитория (во временную директорию) и чтения файлов.
- **Шаг 3: Расширение AI.** Научить `AiService` принимать не только текст, но и пути к файлам в репозитории, чтобы формировать более контекстные промпты (например, "Проанализируй этот файл и предложи рефакторинг").

## ✅ Тестирование

Мы используем Jest для тестирования бэкенда. Стратегия включает:

- **Unit-тесты** для сервисов (`*.service.spec.ts`): Проверка изолированной бизнес-логики.
- **Интеграционные тесты** для контроллеров (`*.controller.spec.ts`): Проверка полного цикла работы эндпоинта (request -> controller -> service -> response).

Запустить все тесты: `cd api && npm run test`.
