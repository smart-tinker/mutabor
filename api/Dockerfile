# ---- 1. Сборщик (Builder) ----
    FROM node:20-bullseye-slim AS builder

    WORKDIR /usr/src/app
    
    COPY package*.json ./
    RUN npm install
    COPY . .
    RUN npm run build
    
    # ---- 2. Финальный образ (Production) ----
    FROM node:20-bullseye-slim
    
    # ШАГ 1: УСТАНАВЛИВАЕМ JAVA, UNZIP И ДРУГИЕ УТИЛИТЫ
    RUN apt-get update && apt-get install -y \
        curl \
        default-jre-headless \
        unzip \
        && apt-get clean && rm -rf /var/lib/apt/lists/*
    
    # ШАГ 2: СОЗДАЕМ ПАПКУ И РАСПАКОВЫВАЕМ LIQUIBASE ПРЯМО В НЕЕ (ИСПРАВЛЕНО)
    # Мы создаем папку назначения ЗАРАНЕЕ, и распаковываем архив сразу туда.
    # Это решает проблему, так как команда `mv` больше не нужна.
    RUN mkdir -p /usr/local/liquibase \
        && curl -L https://github.com/liquibase/liquibase/releases/download/v4.28.0/liquibase-4.28.0.zip -o liquibase.zip \
        && unzip liquibase.zip -d /usr/local/liquibase \
        && rm liquibase.zip
    
    # ШАГ 3: ДОБАВЛЯЕМ LIQUIBASE В СИСТЕМНЫЙ PATH
    # Путь верный, так как мы создали папку /usr/local/liquibase
    ENV PATH="/usr/local/liquibase:${PATH}"
    
    WORKDIR /usr/src/app
    
    COPY package*.json ./
    RUN npm install --omit=dev
    
    COPY --from=builder /usr/src/app/dist ./dist
    # Копируем и knexfile, и папку с миграциями Liquibase
    COPY --from=builder /usr/src/app/knexfile.js ./knexfile.js
    COPY --from=builder /usr/src/app/db ./db
    
    EXPOSE 3000
    
    # Команда запуска остается той же - она правильная
    CMD ["sh", "-c", "echo 'Running database migrations...' && npm run migrate && echo 'Migrations complete. Starting application...' && node dist/main.js"]