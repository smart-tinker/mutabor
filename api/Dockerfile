# ---- 1. Сборщик (Builder) ----
# Используем Bullseye, который содержит OpenSSL 1.1
FROM node:18-bullseye-slim AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# ---- 2. Финальный образ (Production) ----
FROM node:18-bullseye-slim

# УСТАНАВЛИВАЕМ CURL ДЛЯ HEALTHCHECK
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "echo 'Application starting...' && node dist/main.js"]
