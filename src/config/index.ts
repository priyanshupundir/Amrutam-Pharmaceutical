import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // PostgreSQL Configuration
  DATABASE_URL: z.string().url().default('postgres://postgres:postgres@localhost:5432/amrutam_telemedicine'),
  DATABASE_POOL_MIN: z.coerce.number().default(5),
  DATABASE_POOL_MAX: z.coerce.number().default(20),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  DATABASE_CONN_TIMEOUT_MS: z.coerce.number().default(5000),

  // Redis Configuration
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_KEY_PREFIX: z.string().default('amrutam:'),

  // Security & Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long').default('amrutam_telemedicine_super_secure_jwt_access_secret_2026_min32bytes!'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long').default('amrutam_telemedicine_super_secure_jwt_refresh_secret_2026_min32bytes!'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),

  // Cryptography & Compliance
  PHI_ENCRYPTION_KEY: z.string().length(64, 'PHI_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)').default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  AUDIT_HMAC_SECRET: z.string().min(16).default('amrutam_tamper_evident_audit_log_hmac_secret_key_2026'),

  // Rate Limiting & Resilience
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  CIRCUIT_BREAKER_TIMEOUT_MS: z.coerce.number().default(3000),
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.coerce.number().default(30000),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // Output clean error summary for missing or invalid variables
  console.error('❌ Invalid environment configuration:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const config = parsedEnv.data;
export type Config = z.infer<typeof envSchema>;
