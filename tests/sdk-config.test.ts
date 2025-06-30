import { describe, expect, it } from 'bun:test';
import type { LightfastComputerConfig } from '@/sdk';

describe('SDK configuration with providers', () => {
  describe('provider-based configuration', () => {
    it('should work with fly provider config', () => {
      const flyProviderConfig: LightfastComputerConfig = {
        provider: 'fly',
        flyApiToken: 'fly_token_123',
        appName: 'test-app',
      };

      expect(flyProviderConfig.provider).toBe('fly');
      if (flyProviderConfig.provider === 'fly') {
        expect(flyProviderConfig.flyApiToken).toBe('fly_token_123');
        expect(flyProviderConfig.appName).toBe('test-app');
      }
    });

    it('should work with vercel provider config', () => {
      const vercelProviderConfig: LightfastComputerConfig = {
        provider: 'vercel',
        vercelToken: 'vercel_token_123',
        projectId: 'prj_123',
        teamId: 'team_123',
      };

      expect(vercelProviderConfig.provider).toBe('vercel');
      if (vercelProviderConfig.provider === 'vercel') {
        expect(vercelProviderConfig.vercelToken).toBe('vercel_token_123');
        expect(vercelProviderConfig.projectId).toBe('prj_123');
        expect(vercelProviderConfig.teamId).toBe('team_123');
      }
    });

    it('should enforce discriminated union type safety', () => {
      const configs: LightfastComputerConfig[] = [
        {
          provider: 'fly',
          flyApiToken: 'fly_token',
          appName: 'app',
        },
        {
          provider: 'vercel',
          vercelToken: 'vercel_token',
        },
      ];

      configs.forEach((config) => {
        if ('provider' in config) {
          if (config.provider === 'fly') {
            expect(config.flyApiToken).toBeDefined();
            expect(config.appName).toBeDefined();
            // @ts-expect-error - vercelToken should not exist on fly config
            expect(config.vercelToken).toBeUndefined();
          } else if (config.provider === 'vercel') {
            expect(config.vercelToken).toBeDefined();
            // @ts-expect-error - flyApiToken should not exist on vercel config
            expect(config.flyApiToken).toBeUndefined();
          }
        }
      });
    });
  });
});
