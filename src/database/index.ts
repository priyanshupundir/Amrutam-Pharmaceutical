import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../core/logger';

export class DatabasePool {
  private static instance: DatabasePool;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      min: config.DATABASE_POOL_MIN,
      max: config.DATABASE_POOL_MAX,
      idleTimeoutMillis: config.DATABASE_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: config.DATABASE_CONN_TIMEOUT_MS,
    });

    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected PostgreSQL client error on idle connection');
    });
  }

  public static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query<R extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<R>> {
    const start = Date.now();
    try {
      const res = await this.pool.query<R>(text, params);
      const duration = Date.now() - start;
      if (duration > 200) {
        logger.warn({ text, duration, rows: res.rowCount }, 'Slow database query detected');
      }
      return res;
    } catch (error) {
      logger.error({ text, params, error }, 'Database query execution failed');
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const res = await this.pool.query('SELECT 1 as healthy');
      return res.rows[0]?.healthy === 1;
    } catch (err) {
      logger.error({ err }, 'Database health check failed');
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = DatabasePool.getInstance();
