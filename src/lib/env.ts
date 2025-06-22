import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // SDK Configuration
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // Fly.io Configuration
    // Allow empty/missing token in test environment for CI
    FLY_API_TOKEN: z.string().min(1).optional().default('test-token-for-ci'),
  },

  client: {
    // No client-side env vars needed for this SDK
  },

  clientPrefix: 'PUBLIC_',

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    FLY_API_TOKEN: process.env.FLY_API_TOKEN || (process.env.NODE_ENV === 'test' ? 'test-token-for-ci' : undefined),
  },

  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true' || process.env.NODE_ENV === 'test',

  emptyStringAsUndefined: true,
});

// Re-export for backwards compatibility
export const config = {
  nodeEnv: env.NODE_ENV,
  logLevel: env.LOG_LEVEL,
  flyApiToken: env.FLY_API_TOKEN,
};

export type Config = typeof config;
