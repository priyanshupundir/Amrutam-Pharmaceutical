import fs from 'fs';
import path from 'path';
import { db } from './index';
import { logger } from '../core/logger';

export async function runMigrations(): Promise<void> {
  logger.info('Starting PostgreSQL schema migration...');
  const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await db.query(sql);
    logger.info('✅ PostgreSQL schema migrations applied successfully.');
  } catch (error) {
    logger.error({ error }, '❌ Database migration failed.');
    throw error;
  }
}

// Execute directly when invoked via CLI
if (require.main === module) {
  runMigrations()
    .then(async () => {
      await db.close();
      process.exit(0);
    })
    .catch(async () => {
      await db.close();
      process.exit(1);
    });
}
