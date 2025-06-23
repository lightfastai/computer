import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  clientPrefix: 'NEXT_PUBLIC_',
  client: {
    NEXT_PUBLIC_FLY_API_TOKEN: z.string().min(1),
    NEXT_PUBLIC_FLY_APP_NAME: z.string().default('lightfast-worker-instances'),
  },
  runtimeEnv: {
    NEXT_PUBLIC_FLY_API_TOKEN: process.env.NEXT_PUBLIC_FLY_API_TOKEN,
    NEXT_PUBLIC_FLY_APP_NAME: process.env.NEXT_PUBLIC_FLY_APP_NAME,
  },
  emptyStringAsUndefined: true,
});
