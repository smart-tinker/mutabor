import { Module, Global, Logger } from '@nestjs/common'; // Added Logger
import { KNEX_CONNECTION } from './knex.constants';
import knex from 'knex';
import knexfile from '../../knexfile'; // Stays at the top

// Logger instance
const logger = new Logger('KnexModule');

const knexProvider = {
  provide: KNEX_CONNECTION,
  useFactory: async () => {
    // Moved config loading logic inside useFactory
    const environment = process.env.NODE_ENV || 'development';
    const knexConfig = knexfile[environment];

    if (!knexConfig) {
      // Log the error before throwing
      logger.error(`Knex configuration for environment '${environment}' not found in knexfile.js`);
      throw new Error(`Knex configuration for environment '${environment}' not found in knexfile.js`);
    }

    const db = knex(knexConfig);

    try {
      await db.raw('select 1+1 as result');
      logger.log('Successfully connected to the database using Knex.'); // Use NestJS Logger
    } catch (error) {
      // Use NestJS Logger and log the stack
      logger.error('Failed to connect to the database using Knex:', error.stack);
      throw error;
    }
    return db;
  },
};

@Global()
@Module({
  providers: [knexProvider],
  exports: [knexProvider],
})
export class KnexModule {}
