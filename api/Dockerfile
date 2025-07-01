# ---- 1. Сборщик (Builder) ----
FROM node:20-bullseye-slim AS builder

WORKDIR /app
COPY package*.json ./
# ### ИЗМЕНЕНИЕ: Устанавливаем ВСЕ зависимости, так как bcrypt нужен для сидинга
RUN npm install
COPY . .
RUN npm run build

# ---- 2. Финальный образ (Production) ----
FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y \
    curl \
    default-jre-headless \
    unzip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/local/liquibase \
    && curl -L https://github.com/liquibase/liquibase/releases/download/v4.28.0/liquibase-4.28.0.zip -o liquibase.zip \
    && unzip liquibase.zip -d /usr/local/liquibase \
    && rm liquibase.zip \
    && chmod +x /usr/local/liquibase/liquibase
ENV PATH="/usr/local/liquibase:${PATH}"

WORKDIR /app

# ### ИЗМЕНЕНИЕ: Копируем все node_modules, включая dev, так как knex и bcrypt нужны для сидинга
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/knexfile.js ./knexfile.js
COPY --from=builder /app/db ./db
COPY --from=builder /app/liquibase.properties ./liquibase.properties

EXPOSE 3001

# ### ИЗМЕНЕНИЕ: Добавлен запуск `npm run seed` после миграций
CMD ["sh", "-c", "liquibase --url=\"jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}\" --username=\"${DB_USER}\" --password=\"${DB_PASSWORD}\" update && npm run seed && node dist/main.js"]