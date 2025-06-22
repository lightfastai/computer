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
};

export type Config = typeof config;
