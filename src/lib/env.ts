import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // Server Configuration
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // Fly.io Configuration
    FLY_API_TOKEN: z.string().min(1),
    FLY_ORG_SLUG: z.string().min(1),

    // Instance Defaults
    DEFAULT_REGION: z.string().default('iad'),
    DEFAULT_MACHINE_SIZE: z.string().default('shared-cpu-1x'),
    DEFAULT_MEMORY_MB: z.coerce.number().default(512),
    DEFAULT_IMAGE: z.string().default('ubuntu:22.04'),
  },

  client: {
    // No client-side env vars needed for this project
  },

  clientPrefix: 'PUBLIC_',

  runtimeEnv: {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    FLY_API_TOKEN: process.env.FLY_API_TOKEN,
    FLY_ORG_SLUG: process.env.FLY_ORG_SLUG,
    DEFAULT_REGION: process.env.DEFAULT_REGION,
    DEFAULT_MACHINE_SIZE: process.env.DEFAULT_MACHINE_SIZE,
    DEFAULT_MEMORY_MB: process.env.DEFAULT_MEMORY_MB,
    DEFAULT_IMAGE: process.env.DEFAULT_IMAGE,
  },

  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',

  emptyStringAsUndefined: true,
});

// Re-export for backwards compatibility
export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  logLevel: env.LOG_LEVEL,
  flyApiToken: env.FLY_API_TOKEN,
  flyOrgSlug: env.FLY_ORG_SLUG,
  defaultRegion: env.DEFAULT_REGION,
  defaultMachineSize: env.DEFAULT_MACHINE_SIZE,
  defaultMemoryMb: env.DEFAULT_MEMORY_MB,
  defaultImage: env.DEFAULT_IMAGE,
  // These were removed as they're not used in the simplified architecture
  databaseUrl: '',
  rateLimitWindow: 60000,
  rateLimitMax: 100,
};

export type Config = typeof config;
