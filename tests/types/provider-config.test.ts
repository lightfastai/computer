import { describe, expect, it } from 'bun:test';
import type { ProviderConfig } from '@/types/provider';

describe('ProviderConfig discriminated union', () => {
  it('should require flyApiToken when provider is fly', () => {
    const flyConfig: ProviderConfig = {
      provider: 'fly',
      flyApiToken: 'fly_token_123',
      appName: 'test-app',
    };

    expect(flyConfig.provider).toBe('fly');
    expect(flyConfig.flyApiToken).toBe('fly_token_123');
    expect(flyConfig.appName).toBe('test-app');
  });

  it('should require vercelToken when provider is vercel', () => {
    const vercelConfig: ProviderConfig = {
      provider: 'vercel',
      vercelToken: 'vercel_token_123',
      projectId: 'prj_123',
      teamId: 'team_123',
    };

    expect(vercelConfig.provider).toBe('vercel');
    expect(vercelConfig.vercelToken).toBe('vercel_token_123');
    expect(vercelConfig.projectId).toBe('prj_123');
    expect(vercelConfig.teamId).toBe('team_123');
  });

  it('should not allow flyApiToken with vercel provider', () => {
    // @ts-expect-error - flyApiToken should not be allowed with vercel provider
    const _invalidConfig: ProviderConfig = {
      provider: 'vercel',
      flyApiToken: 'fly_token_123',
      vercelToken: 'vercel_token_123',
    };

    // This test ensures TypeScript catches the error at compile time
    expect(true).toBe(true);
  });

  it('should not allow vercelToken with fly provider', () => {
    // @ts-expect-error - vercelToken should not be allowed with fly provider
    const _invalidConfig: ProviderConfig = {
      provider: 'fly',
      vercelToken: 'vercel_token_123',
      flyApiToken: 'fly_token_123',
      appName: 'test-app',
    };

    // This test ensures TypeScript catches the error at compile time
    expect(true).toBe(true);
  });

  it('should work with type guards', () => {
    const configs: ProviderConfig[] = [
      {
        provider: 'fly',
        flyApiToken: 'fly_token',
        appName: 'test-app',
      },
      {
        provider: 'vercel',
        vercelToken: 'vercel_token',
        projectId: 'prj_123',
      },
    ];

    configs.forEach((config) => {
      if (config.provider === 'fly') {
        // TypeScript should know flyApiToken is available
        expect(config.flyApiToken).toBeDefined();
        expect(config.appName).toBeDefined();
        // @ts-expect-error - vercelToken should not exist on fly config
        expect(config.vercelToken).toBeUndefined();
      } else if (config.provider === 'vercel') {
        // TypeScript should know vercelToken is available
        expect(config.vercelToken).toBeDefined();
        // @ts-expect-error - flyApiToken should not exist on vercel config
        expect(config.flyApiToken).toBeUndefined();
      }
    });
  });
});
