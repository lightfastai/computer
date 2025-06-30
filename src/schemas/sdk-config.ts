import { z } from 'zod';

const loggerSchema = z
  .object({
    info: z.function(),
    error: z.function(),
    debug: z.function(),
    warn: z.function(),
    level: z.string().optional(),
  })
  .optional();

export const flyProviderConfigSchema = z.object({
  provider: z.literal('fly'),
  flyApiToken: z.string().min(1, 'Fly API token is required'),
  appName: z.string().min(1, 'App name is required'),
  logger: loggerSchema,
});

export const vercelProviderConfigSchema = z.object({
  provider: z.literal('vercel'),
  vercelToken: z.string().min(1, 'Vercel token is required'),
  projectId: z.string().optional(),
  teamId: z.string().optional(),
  logger: loggerSchema,
});

export const lightfastComputerConfigSchema = z.discriminatedUnion('provider', [
  flyProviderConfigSchema,
  vercelProviderConfigSchema,
]);

export type FlyProviderConfig = z.infer<typeof flyProviderConfigSchema>;
export type VercelProviderConfig = z.infer<typeof vercelProviderConfigSchema>;
export type LightfastComputerConfig = z.infer<typeof lightfastComputerConfigSchema>;
