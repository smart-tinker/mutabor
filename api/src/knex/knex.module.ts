import { Module, Global } from '@nestjs/common';
import { KNEX_CONNECTION } from './knex.constants';
import knex from 'knex'; // Import the knex function
import knexfile from '../../knexfile'; // Import knexfile configuration

// Determine the environment based on NODE_ENV or default to 'development'
const environment = process.env.NODE_ENV || 'development';
const knexConfig = knexfile[environment];

if (!knexConfig) {
  throw new Error(`Knex configuration for environment '${environment}' not found in knexfile.js`);
}

const knexProvider = {
  provide: KNEX_CONNECTION,
  useFactory: async () => {
    const db = knex(knexConfig); // Create knex instance

    // Optional: Test the connection
    try {
      await db.raw('select 1+1 as result');
      console.log('Successfully connected to the database using Knex.');
    } catch (error) {
      console.error('Failed to connect to the database using Knex:', error);
      // Depending on the desired behavior, you might want to throw the error
      // or handle it in a way that allows the application to start if the DB is optional.
      // For now, we'll rethrow to make it clear if connection fails.
      throw error;
    }
    return db;
  },
};

@Global() // Make the module global so Knex_CONNECTION can be injected anywhere
@Module({
  providers: [knexProvider],
  exports: [knexProvider], // Export the provider
})
export class KnexModule {}
