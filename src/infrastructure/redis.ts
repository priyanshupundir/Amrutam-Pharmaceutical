import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../core/logger';

export class RedisService {
  private static instance: RedisService;
  private client: Redis;

  private constructor() {
    this.client = new Redis(config.REDIS_URL, {
      keyPrefix: config.REDIS_KEY_PREFIX,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis disconnected. Reconnecting in ${delay}ms... (attempt ${times})`);
        return delay;
      },
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis server');
    });

    this.client.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  public async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.client.quit();
  }
}

export const redis = RedisService.getInstance();
