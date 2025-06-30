import { describe, expect, it } from 'bun:test';
import {
  flyProviderConfigSchema,
  lightfastComputerConfigSchema,
  vercelProviderConfigSchema,
} from '@/schemas/sdk-config';

describe('SDK config schemas', () => {
  describe('flyProviderConfigSchema', () => {
    it('should validate valid fly provider config', () => {
      const validConfig = {
        provider: 'fly',
        flyApiToken: 'fly_token_123',
        appName: 'test-app',
      };

      const result = flyProviderConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validConfig);
      }
    });

    it('should reject fly config with wrong provider', () => {
      const invalidConfig = {
        provider: 'vercel',
        flyApiToken: 'fly_token_123',
        appName: 'test-app',
      };

      const result = flyProviderConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('vercelProviderConfigSchema', () => {
    it('should validate minimal vercel config', () => {
      const validConfig = {
        provider: 'vercel',
        vercelToken: 'vercel_token_123',
      };

      const result = vercelProviderConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should validate vercel config with optional fields', () => {
      const validConfig = {
        provider: 'vercel',
        vercelToken: 'vercel_token_123',
        projectId: 'prj_123',
        teamId: 'team_123',
      };

      const result = vercelProviderConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject vercel config without token', () => {
      const invalidConfig = {
        provider: 'vercel',
        projectId: 'prj_123',
        // missing vercelToken
      };

      const result = vercelProviderConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('lightfastComputerConfigSchema (discriminated union)', () => {
    it('should validate fly provider config', () => {
      const flyProviderConfig = {
        provider: 'fly',
        flyApiToken: 'fly_token_123',
        appName: 'test-app',
      };

      const result = lightfastComputerConfigSchema.safeParse(flyProviderConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe('fly');
        if (result.data.provider === 'fly') {
          expect(result.data.flyApiToken).toBe('fly_token_123');
          expect(result.data.appName).toBe('test-app');
        }
      }
    });

    it('should validate vercel provider config', () => {
      const vercelProviderConfig = {
        provider: 'vercel',
        vercelToken: 'vercel_token_123',
      };

      const result = lightfastComputerConfigSchema.safeParse(vercelProviderConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe('vercel');
        if (result.data.provider === 'vercel') {
          expect(result.data.vercelToken).toBe('vercel_token_123');
        }
      }
    });

    it('should reject invalid provider', () => {
      const invalidConfig = {
        provider: 'aws',
        token: 'some_token',
      };

      const result = lightfastComputerConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject completely invalid config', () => {
      const invalidConfig = {
        randomField: 'value',
      };

      const result = lightfastComputerConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
});
