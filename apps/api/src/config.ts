import 'dotenv/config';
import { z } from 'zod';

const env = z.object({
  NODE_ENV:     z.enum(['development', 'production', 'test']).default('development'),
  PORT:         z.coerce.number().default(3001),
  DATABASE_URL: z.string(),
  REDIS_URL:    z.string(),
  LOG_LEVEL:    z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN:  z.string().default('http://localhost:3000'),
}).parse(process.env);

export const config = {
  nodeEnv:    env.NODE_ENV,
  port:       env.PORT,
  databaseUrl: env.DATABASE_URL,
  redisUrl:   env.REDIS_URL,
  logLevel:   env.LOG_LEVEL,
  corsOrigin: env.CORS_ORIGIN,
};
