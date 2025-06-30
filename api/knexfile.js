// api/knexfile.js

// Загружаем переменные из .env файла. Это важно для локальной разработки без Docker.
// В Docker-окружении переменные будут предоставлены через docker-compose.yml.
require('dotenv').config({ path: './.env' });

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  // --- Конфигурация для разработки ---
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '54321', 10),
      database: process.env.DB_NAME || 'mutabor',
      user: process.env.DB_USER || 'user',
      password: process.env.DB_PASSWORD || 'password',
    },
    pool: {
      min: 2,
      max: 10,
    },
    seeds: {
      directory: './db/seeds',
    },
  },

  // ### ИЗМЕНЕНИЕ: Конфигурация для тестов ###
  test: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '54321', 10),
      database: process.env.DB_NAME || 'mutabor',
      user: process.env.DB_USER || 'user',
      password: process.env.DB_PASSWORD || 'password',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  // --- Конфигурация для Staging ---
  staging: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
    seeds: {
      directory: './db/seeds',
    },
  },

  // --- Конфигурация для Production ---
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Настройте в зависимости от вашего хостинга
    },
    pool: {
      min: 2,
      max: 10,
    },
    seeds: {
      directory: './db/seeds',
    },
  },
};