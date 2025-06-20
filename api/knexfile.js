// Schema migrations are handled by Liquibase.
// Knex is used for query building and can be used for data seeding.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: './.env' }); // Adjust path as necessary

module.exports = {
  development: {
    client: 'pg',
    connection: {
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
      directory: './db/seeds', // Knex seeds directory
    },
  },

  staging: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10,
    },
    seeds: { // Added seeds block for staging, assuming it might be needed
      directory: './db/seeds',
    },
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      // Ensure proper CA configuration if using self-signed certificates or specific CAs, e.g., { ca: 'path/to/your/ca.pem' }
      ssl: { rejectUnauthorized: true },
    },
    pool: {
      min: 2,
      max: 10,
    },
    seeds: { // Added seeds block for production, assuming it might be needed
      directory: './db/seeds',
    },
  },
};
