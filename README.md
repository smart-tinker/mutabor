# Mutabor: Интеллектуальный Таск-менеджер

[![CI/CD Status](https://img.shields.io/badge/CI%2FCD-passing-brightgreen)](https://github.com/your-repo/mutabor/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

"Mutabor" — это веб-приложение для управления задачами с Kanban-доской, созданное для небольших команд. Ключевая особенность — встроенный AI-ассистент, который помогает автоматизировать рутинные задачи, такие как декомпозиция и анализ.

Продукт спроектирован как платформа, позволяющая пользователям подключать свои собственные ключи к AI-провайдерам для персонализации и контроля над расходами.

## Оглавление (Table of Contents)


- [🚀 Установка и Запуск (Installation and Startup)](#-установка-и-запуск-installation-and-startup)
  - [Предварительные требования (Prerequisites)](#предварительные-требования-prerequisites)
  - [Общая первоначальная настройка (Common Initial Setup)](#общая-первоначальная-настройка-common-initial-setup)
  - [Локальный запуск через Docker Compose (Full Stack Docker Compose Setup)](#локальный-запуск-через-docker-compose-full-stack-docker-compose-setup)
  - [Режим локальной разработки (Manual Local Development Setup)](#режим-локальной-разработки-manual-local-development-setup)
- [🛠️ Основные команды для разработки (Key Development Commands)](#основные-команды-для-разработки-key-development-commands)
- [🏛️ Архитектура и Ключевые особенности (Architecture and Key Features)](#архитектура-и-ключевые-особенности-architecture-and-key-features)
- [🔌 API Документация (API Documentation)](#api-документация-api-documentation)
- [💡 Точки расширения (Extension Points)](#точки-расширения-extension-points)
- [✅ Тестирование (Testing)](#тестирование-testing)


## 🚀 Установка и Запуск (Installation and Startup)

В этом разделе описываются различные способы установки и запуска проекта для локальной разработки.

### Предварительные требования (Prerequisites)
- [Node.js](https://nodejs.org/) (v18.x или выше)
- [Docker](https://www.docker.com/) и [Docker Compose](https://docs.docker.com/compose/)
- Для запуска с Docker Compose: Файл `docker-compose.yml` в корне проекта и `Dockerfile` для `client` и `api` модулей. Пример `docker-compose.yml` приведен ниже.
- Для ручного запуска или использования Supabase CLI: Соответствующие инструменты (Supabase CLI, Node.js/npm для запуска сервисов).

### Общая первоначальная настройка (Common Initial Setup)

1.  **Клонировать репозиторий** (если еще не сделали):
    ```bash
    git clone https://github.com/your-repo/mutabor.git
    cd mutabor
    ```
2.  **Установить корневые зависимости**:
    Установка зависимостей на уровне корневого `package.json` (если есть) и для воркспейсов (`client` и `api`).
    ```bash
    npm install
    ```
    Эта команда также установит зависимости для `client` и `api`, если вы используете npm workspaces (проверьте ваш корневой `package.json`). Если нет, вам может потребоваться выполнить `npm install` в каждой директории (`./api` и `./client`) отдельно для ручного режима запуска.

3.  **Создать файл `.env` для API**:
    Скопируйте файл `api/.env.example` в `api/.env` и измените его (`cp api/.env.example api/.env`). Этот файл будет содержать переменные окружения для бэкенда.
    Файл `api/.env.example` выглядит так:
    ```env
    # Example environment variables for the API

    # Port for the API server
    PORT=3000

    # Connection string for the PostgreSQL database
    # Example for Docker Compose: postgresql://user:password@db:5432/mutabor?schema=public
    # Example for Supabase CLI: postgresql://postgres:postgres@localhost:54322/postgres
    # Example for local PostgreSQL: postgresql://user:password@localhost:5432/mutabor
    DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase?schema=public"

    # JWT Secret Key
    JWT_SECRET="YOUR_SUPER_SECRET_JWT_KEY_PLEASE_CHANGE_ME"
    ```
    **Важно:**
    - Замените `YOUR_SUPER_SECRET_JWT_KEY_PLEASE_CHANGE_ME` на надежный случайный ключ для `JWT_SECRET`.
    - `DATABASE_URL` будет зависеть от выбранного вами способа запуска базы данных (см. ниже).
    - Измените `PORT`, если порт `3000` уже занят или вам нужен другой.

### Локальный запуск через Docker Compose (Full Stack Docker Compose Setup)

Этот метод позволяет запустить все части приложения (фронтенд, бэкенд, база данных) с помощью одной команды, используя Docker Compose.

1.  **Создайте файл `docker-compose.yml`** в корне проекта (если его еще нет):
    ```yaml
    # docker-compose.yml
    version: '3.8'

    services:
      client: # Сервис фронтенда
        build:
          context: ./client
          dockerfile: Dockerfile
        ports:
          - "3000:3000"
        depends_on:
          - api
        environment:
          - REACT_APP_API_URL=http://localhost:3001
        volumes:
          - ./client/src:/app/src
          - ./client/public:/app/public

      api: # Сервис бэкенда
        build:
          context: ./api
          dockerfile: Dockerfile
        ports:
          - "3001:3001"
        depends_on:
          - db
        environment:
          # DATABASE_URL для подключения к сервису 'db' в Docker Compose
          - DATABASE_URL=postgresql://user:password@db:5432/mutabor?schema=public
          # JWT_SECRET должен быть тем же, что и в api/.env, если .env файл не используется Docker образом API
          - JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_PLEASE_CHANGE_ME
        volumes:
          - ./api/src:/app/src

      db: # Сервис базы данных PostgreSQL
        image: postgres:13
        ports:
          # Порт 54321 на хосте будет связан с портом 5432 внутри контейнера
          - "54321:5432"
        environment:
          POSTGRES_USER: user
          POSTGRES_PASSWORD: password
          POSTGRES_DB: mutabor
        volumes:
          - postgres_data:/var/lib/postgresql/data

    volumes:
      postgres_data:
    ```
    **Примечание:** Убедитесь, что у вас есть соответствующие `Dockerfile` в директориях `client` и `api`. Переменные окружения для сервиса `api` (включая `DATABASE_URL` и `JWT_SECRET`) задаются в секции `environment` файла `docker-compose.yml` и будут использоваться контейнером. Если ваш Docker-образ `api` также загружает переменные из файла `api/.env`, убедитесь, что значения согласованы, чтобы избежать путаницы.

2.  **Проверьте конфигурацию окружения для сервиса `api`**:
    Значения `DATABASE_URL` и `JWT_SECRET` для контейнера `api` устанавливаются напрямую в секции `environment` файла `docker-compose.yml`. Файл `api/.env` в первую очередь используется для режима ручного локального запуска (см. соответствующий раздел). Если вы также используете `api/.env` с Docker Compose (например, если ваш образ API его читает), убедитесь, что значения в `api/.env` не конфликтуют с теми, что указаны в `docker-compose.yml`.

3.  **Запустите сервисы**:
    Эта команда соберет образы (если необходимо) и запустит все сервисы: фронтенд, бэкенд и базу данных.
    ```bash
    docker-compose up --build
    ```
    *   **Бэкенд (API)** будет доступен по адресу: `http://localhost:3001`
    *   **Фронтенд (Client)** будет доступен по адресу: `http://localhost:3000`
    *   Удалите `depends_on: - db` из сервиса `api`.

### Режим локальной разработки (Manual Local Development Setup)

Этот режим предназначен для разработчиков, которые предпочитают запускать базу данных в Docker-контейнере или через Supabase CLI, а фронтенд и бэкенд сервисы – вручную на своей машине для более гранулярного контроля.

**1. Настройка базы данных (Database Setup)**

Выберите один из следующих вариантов для запуска локальной базы данных:

*   **Вариант A: Использование Supabase CLI (Using Supabase CLI)**
    1.  Установите [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started), если еще не сделали этого.
    2.  Запустите локальный Supabase-стек:
        ```bash
        supabase start
        ```
    3.  После запуска CLI выведет необходимые данные для подключения, включая `DATABASE_URL` (обычно что-то вроде `postgresql://postgres:postgres@localhost:54322/postgres`). Используйте это значение в вашем `api/.env` файле (см. "Общая первоначальная настройка").
    4.  Для применения миграций из `prisma/migrations` (после первого запуска или изменений схемы) выполните:
        ```bash
        supabase db reset
        ```
        Или, если вы хотите применить новые миграции к уже существующей локальной базе Supabase (убедитесь, что `DATABASE_URL` в `api/.env` корректен):
        ```bash
        npx prisma migrate dev --schema=./api/prisma/schema.prisma
        ```

*   **Вариант B: Запуск PostgreSQL через Docker Compose (Running PostgreSQL via Docker Compose)**
    1.  Убедитесь, что у вас есть файл `docker-compose.yml` в корне проекта (пример приведен выше в разделе "Локальный запуск через Docker Compose").
    2.  Запустите только сервис базы данных `db` в фоновом режиме:
        ```bash
        docker-compose up -d db
        ```
    3.  В этом случае, `DATABASE_URL` для вашего `api/.env` файла должен указывать на порт, который вы пробросили для сервиса `db` в `docker-compose.yml`. Если вы использовали пример (`ports: - "54321:5432"`), то URL будет:
        `postgresql://user:password@localhost:54321/mutabor?schema=public`
        (Замените `user`, `password`, `mutabor` если вы изменили их в `docker-compose.yml`). Установите это значение в `api/.env`.

**2. Конфигурация `api/.env`**

Как указано в разделе "Общая первоначальная настройка", убедитесь, что файл `api/.env` содержит корректный `DATABASE_URL` для выбранного метода и ваш `JWT_SECRET`.

Пример для `api/.env` при использовании Docker Compose для БД (Вариант B):
```env
DATABASE_URL="postgresql://user:password@localhost:54321/mutabor?schema=public"
JWT_SECRET="YOUR_SUPER_SECRET_JWT_KEY_PLEASE_CHANGE_ME"
```

**3. Запуск сервисов вручную (Running Services Manually)**

После настройки базы данных и файла `.env`, вы можете запустить бэкенд и фронтенд в отдельных терминалах:

*   **Для запуска Бэкенда (API):**
    1.  Перейдите в директорию API: `cd api`
    2.  Установите зависимости (если не делали этого ранее в рамках `npm install` в корне): `npm install`
    3.  Запустите в режиме разработки: `npm run dev`
    *   API будет доступен по адресу: `http://localhost:3001`

*   **Для запуска Фронтенда (Client):**
    1.  Перейдите в директорию фронтенда: `cd client`
    2.  Установите зависимости (если не делали этого ранее): `npm install`
    3.  Запустите в режиме разработки: `npm run dev`
    *   Фронтенд будет доступен по адресу: `http://localhost:3000`
    *   **Конфигурация API для клиента:** Клиент использует переменную окружения `VITE_API_URL` для определения URL API. Файл `client/.env.example` уже содержит стандартное значение (`http://localhost:3001`). Если вам нужно изменить это значение, скопируйте `client/.env.example` в `client/.env` (`cp client/.env.example client/.env`) и внесите необходимые изменения. Затем перезапустите процесс разработки клиента.

Этот подход дает вам больше контроля над каждым сервисом и их логами напрямую в терминале.

## 🛠️ Основные команды для разработки

- `npm run dev`: Запустить frontend и backend в режиме разработки с hot-reload.
- `npm run build`: Собрать продакшн-версии приложений.
- `npm run test`: Запустить тесты (unit и интеграционные) для backend.
- `npm run lint`: Проверить код на соответствие стандартам стиля.
- `npm run db:migrate`: Применить новые миграции схемы базы данных (выполнять в `api/` директории). Убедитесь, что ваша `DATABASE_URL` в `api/.env` указывает на целевую локальную базу данных (например, запущенную через Supabase CLI или Docker). Для локального Supabase CLI также можно использовать `supabase db reset` для применения всех миграций.

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
