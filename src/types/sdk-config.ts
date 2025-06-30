import type { Logger } from '@/types/logger';

export type LegacyLightfastComputerConfig = {
  flyApiToken: string;
  appName: string;
  logger?: Logger;
};

export type FlyProviderConfig = {
  provider: 'fly';
  flyApiToken: string;
  appName: string;
  logger?: Logger;
};

export type VercelProviderConfig = {
  provider: 'vercel';
  vercelToken: string;
  projectId?: string;
  teamId?: string;
  logger?: Logger;
};

export type ProviderBasedConfig = FlyProviderConfig | VercelProviderConfig;

export type LightfastComputerConfig = LegacyLightfastComputerConfig | ProviderBasedConfig;

export const isLegacyConfig = (config: LightfastComputerConfig): config is LegacyLightfastComputerConfig => {
  return !('provider' in config);
};

export const isProviderConfig = (config: LightfastComputerConfig): config is ProviderBasedConfig => {
  return 'provider' in config;
};

export const isFlyProviderConfig = (config: LightfastComputerConfig): config is FlyProviderConfig => {
  return 'provider' in config && config.provider === 'fly';
};

export const isVercelProviderConfig = (config: LightfastComputerConfig): config is VercelProviderConfig => {
  return 'provider' in config && config.provider === 'vercel';
};
