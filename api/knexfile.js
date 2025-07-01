// api/knexfile.js

const env = process.env.NODE_ENV || 'development';
if (env === 'development') {
    require('dotenv').config({ path: './.env.dev' });
} else if (env === 'test') {
    require('dotenv').config({ path: './.env.test' });
} else {
    require('dotenv').config({ path: './.env' });
}

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
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
  test: {
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
  production: {
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
};