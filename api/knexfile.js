// api/knexfile.js

// Загружаем переменные из .env файла в зависимости от окружения.
// Это важно для локальной разработки без Docker.
// В Docker-окружении эти переменные будут предоставлены через docker compose.
const env = process.env.NODE_ENV || 'development';
if (env === 'development') {
    require('dotenv').config({ path: './.env.dev' });
} else if (env === 'test') {
    require('dotenv').config({ path: './.env.test' });
} else {
    // For production or any other case, it might use .env
    require('dotenv').config({ path: './.env' });
}


/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  // --- Конфигурация для разработки ---
  development: {
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

  // --- Конфигурация для тестов ---
  test: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
  },

  // --- Конфигурация для Production ---
  production: {
    client: 'pg',
    // ### ИЗМЕНЕНИЕ: Упрощена конфигурация для Production, убрана ненужная для Docker опция SSL.
    // Теперь все окружения используют единый подход через DATABASE_URL.
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
    seeds: {
      directory: './db/seeds',
    },
  },
};