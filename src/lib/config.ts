import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Server
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Fly.io
  flyApiToken: z.string(),
  flyOrgSlug: z.string(),

  // Database
  databaseUrl: z.string().default('sqlite://./data.db'),

  // API
  rateLimitWindow: z.coerce.number().default(60000),
  rateLimitMax: z.coerce.number().default(100),

  // Instance defaults
  defaultRegion: z.string().default('sea'),
  defaultMachineSize: z.string().default('shared-cpu-1x'),
  defaultMemoryMb: z.coerce.number().default(512),
  defaultImage: z.string().default('ubuntu:22.04'),
});

const env = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
  flyApiToken: process.env.FLY_API_TOKEN,
  flyOrgSlug: process.env.FLY_ORG_SLUG,
  databaseUrl: process.env.DATABASE_URL,
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW,
  rateLimitMax: process.env.RATE_LIMIT_MAX,
  defaultRegion: process.env.DEFAULT_REGION,
  defaultMachineSize: process.env.DEFAULT_MACHINE_SIZE,
  defaultMemoryMb: process.env.DEFAULT_MEMORY_MB,
  defaultImage: process.env.DEFAULT_IMAGE,
};

export const config = configSchema.parse(env);

export type Config = typeof config;
