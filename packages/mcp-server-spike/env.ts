import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    ANTHROPIC_API_KEY: z.string().min(1),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  },
  runtimeEnv: process.env,
  // We don't need client-side env vars for this app
  client: {},
  clientPrefix: '',
  // We don't need empty vars for this app
  emptyStringAsUndefined: true,
});
