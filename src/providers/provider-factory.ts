import { ValidationError } from '@/lib/error-handler';
import { FlyProvider } from '@/providers/fly-provider';
import { VercelProvider } from '@/providers/vercel-provider';
import type { LightfastComputerConfig } from '@/schemas/sdk-config';
import { lightfastComputerConfigSchema } from '@/schemas/sdk-config';
import type { Logger } from '@/types/logger';
import type { ComputeProvider } from '@/types/provider';

export const createProvider = (config: LightfastComputerConfig): ComputeProvider => {
  // Validate configuration with Zod
  try {
    lightfastComputerConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError(error.message);
    }
    throw new ValidationError('Invalid provider configuration');
  }

  if ('provider' in config && config.provider === 'fly') {
    const logger = config.logger ? { ...config.logger, level: config.logger.level || 'info' } : createSilentLogger();
    return new FlyProvider(config.flyApiToken, config.appName, logger);
  }

  if ('provider' in config && config.provider === 'vercel') {
    const logger = config.logger ? { ...config.logger, level: config.logger.level || 'info' } : createSilentLogger();
    return new VercelProvider(config.vercelToken, config.projectId, config.teamId, logger);
  }

  throw new ValidationError('Invalid provider configuration');
};

const createSilentLogger = (): Logger => ({
  info: () => {},
  error: () => {},
  debug: () => {},
  warn: () => {},
  level: 'silent',
});
