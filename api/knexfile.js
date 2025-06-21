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
    // Knex автоматически использует `process.env.DATABASE_URL` если он предоставлен.
    // Если `DATABASE_URL` не найден, он перейдет к детальным настройкам в объекте.
    // Это делает файл универсальным и для Docker, и для локального запуска.
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'mutabor_dev',
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

  // --- Конфигурация для Staging ---
  // Здесь мы предполагаем, что DATABASE_URL будет всегда предоставлен средой.
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
  // В production рекомендуется использовать `connectionString` и явно настраивать SSL.
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true }, // Настройте в зависимости от вашего хостинга
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