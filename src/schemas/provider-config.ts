import { z } from 'zod';

export const flyProviderConfigSchema = z.object({
  provider: z.literal('fly'),
  flyApiToken: z.string().min(1, 'Fly API token is required'),
  appName: z.string().min(1, 'App name is required'),
  logger: z.any().optional(),
});

export const vercelProviderConfigSchema = z.object({
  provider: z.literal('vercel'),
  vercelToken: z.string().min(1, 'Vercel token is required'),
  projectId: z.string().optional(),
  teamId: z.string().optional(),
  logger: z.any().optional(),
});

export const providerConfigSchema = z.discriminatedUnion('provider', [
  flyProviderConfigSchema,
  vercelProviderConfigSchema,
]);

export type FlyProviderConfig = z.infer<typeof flyProviderConfigSchema>;
export type VercelProviderConfig = z.infer<typeof vercelProviderConfigSchema>;
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
