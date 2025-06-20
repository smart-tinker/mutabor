# ---- 1. Сборщик (Builder) ----
# Используем Bullseye, который содержит OpenSSL 1.1, ожидаемый Prisma
FROM node:18-bullseye-slim AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build


# ---- 2. Финальный образ (Production) ----
FROM node:18-bullseye-slim

# УСТАНАВЛИВАЕМ CURL ДЛЯ HEALTHCHECK
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate reset --force && npx prisma migrate deploy && node dist/main.js"]