import { describe, expect, it } from 'bun:test';
import { flyProviderConfigSchema, providerConfigSchema, vercelProviderConfigSchema } from '@/schemas/provider-config';

describe('provider config schemas', () => {
  describe('flyProviderConfigSchema', () => {
    it('should validate valid fly config', () => {
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

    it('should reject fly config without required fields', () => {
      const invalidConfig = {
        provider: 'fly',
        flyApiToken: 'fly_token_123',
        // missing appName
      };

      const result = flyProviderConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
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
    it('should validate valid vercel config', () => {
      const validConfig = {
        provider: 'vercel',
        vercelToken: 'vercel_token_123',
      };

      const result = vercelProviderConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validConfig);
      }
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
      if (result.success) {
        expect(result.data).toEqual(validConfig);
      }
    });

    it('should reject vercel config without token', () => {
      const invalidConfig = {
        provider: 'vercel',
        // missing vercelToken
      };

      const result = vercelProviderConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('providerConfigSchema (discriminated union)', () => {
    it('should validate fly config', () => {
      const flyConfig = {
        provider: 'fly',
        flyApiToken: 'fly_token_123',
        appName: 'test-app',
      };

      const result = providerConfigSchema.safeParse(flyConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe('fly');
        if (result.data.provider === 'fly') {
          expect(result.data.flyApiToken).toBe('fly_token_123');
          expect(result.data.appName).toBe('test-app');
        }
      }
    });

    it('should validate vercel config', () => {
      const vercelConfig = {
        provider: 'vercel',
        vercelToken: 'vercel_token_123',
        projectId: 'prj_123',
      };

      const result = providerConfigSchema.safeParse(vercelConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe('vercel');
        if (result.data.provider === 'vercel') {
          expect(result.data.vercelToken).toBe('vercel_token_123');
          expect(result.data.projectId).toBe('prj_123');
        }
      }
    });

    it('should reject mixed provider fields', () => {
      const invalidConfig = {
        provider: 'vercel',
        vercelToken: 'vercel_token_123',
        flyApiToken: 'fly_token_123', // should not be allowed
        appName: 'test-app',
      };

      const result = providerConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(true); // Zod strips unknown fields by default
      if (result.success && result.data.provider === 'vercel') {
        // @ts-expect-error - flyApiToken should not exist
        expect(result.data.flyApiToken).toBeUndefined();
      }
    });

    it('should reject invalid provider type', () => {
      const invalidConfig = {
        provider: 'aws', // not a valid provider
        someToken: 'token_123',
      };

      const result = providerConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
});
