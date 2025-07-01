# ---- 1. Сборщик (Builder) ----
FROM node:20-bullseye-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- 2. Финальный образ (Production) ----
FROM node:20-bullseye-slim

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    curl \
    default-jre-headless \
    unzip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Устанавливаем Liquibase и даем ему права на исполнение
RUN mkdir -p /usr/local/liquibase \
    && curl -L https://github.com/liquibase/liquibase/releases/download/v4.28.0/liquibase-4.28.0.zip -o liquibase.zip \
    && unzip liquibase.zip -d /usr/local/liquibase \
    && rm liquibase.zip \
    && chmod +x /usr/local/liquibase/liquibase
ENV PATH="/usr/local/liquibase:${PATH}"

WORKDIR /app

# Устанавливаем только production-зависимости
COPY package*.json ./
RUN npm install --omit=dev

# Копируем артефакты сборки
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/knexfile.js ./knexfile.js
COPY --from=builder /app/db ./db
# liquibase.properties больше не нужен в финальном образе, но пусть будет на всякий случай
COPY --from=builder /app/liquibase.properties ./liquibase.properties

EXPOSE 3001

# ### ИЗМЕНЕНИЕ: Явно передаем параметры в команду liquibase ###
# Это гарантирует, что переменные окружения будут подставлены корректно.
CMD ["sh", "-c", "liquibase --url=\"jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}\" --username=\"${DB_USER}\" --password=\"${DB_PASSWORD}\" update && node dist/main.js"]