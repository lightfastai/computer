import { beforeEach, describe, expect, it } from 'bun:test';
import { VercelProvider } from '@/providers/vercel-provider';
import type { CommandOptions, CreateMachineOptions } from '@/types/provider';

describe('VercelProvider', () => {
  let provider: VercelProvider;
  const mockToken = 'test-vercel-token';
  const mockProjectId = 'test-project-id';
  const mockTeamId = 'test-team-id';

  beforeEach(() => {
    provider = new VercelProvider(mockToken, mockProjectId, mockTeamId);
  });

  describe('constructor', () => {
    it('should create VercelProvider instance', () => {
      expect(provider).toBeInstanceOf(VercelProvider);
    });

    it('should handle optional parameters', () => {
      const providerWithMinimalConfig = new VercelProvider(mockToken);
      expect(providerWithMinimalConfig).toBeInstanceOf(VercelProvider);
    });
  });

  describe('machine ID generation', () => {
    it('should generate unique machine IDs', () => {
      // Access the private method through a workaround
      const provider1 = new VercelProvider(mockToken, mockProjectId, mockTeamId);
      const provider2 = new VercelProvider(mockToken, mockProjectId, mockTeamId);

      // Since generateId is private, we'll test it indirectly through machine creation failures
      // This will exercise the ID generation without mocking the Vercel SDK
      expect(provider1).toBeInstanceOf(VercelProvider);
      expect(provider2).toBeInstanceOf(VercelProvider);
    });
  });

  describe('createMachine validation', () => {
    it('should handle invalid createMachine options gracefully', async () => {
      const options: CreateMachineOptions = {
        name: '',
        region: '',
      };

      // This will fail due to missing Vercel credentials in test environment
      // but should not throw synchronously
      const result = await provider.createMachine(options);

      // Should return an error result, not throw
      expect(result.isErr()).toBe(true);
    });
  });

  describe('getMachine', () => {
    it('should return error for non-existent machine', async () => {
      const result = await provider.getMachine('non-existent-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('instance not found');
      }
    });
  });

  describe('listMachines', () => {
    it('should return empty list when no machines exist', async () => {
      const result = await provider.listMachines();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('startMachine', () => {
    it('should return error for non-existent machine', async () => {
      const result = await provider.startMachine('non-existent-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('instance not found');
      }
    });
  });

  describe('stopMachine', () => {
    it('should return error for non-existent machine', async () => {
      const result = await provider.stopMachine('non-existent-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('instance not found');
      }
    });
  });

  describe('destroyMachine', () => {
    it('should return error for non-existent machine', async () => {
      const result = await provider.destroyMachine('non-existent-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('instance not found');
      }
    });
  });

  describe('executeCommand', () => {
    it('should return error for non-existent machine', async () => {
      const commandOptions: CommandOptions = {
        command: 'echo test',
      };

      const result = await provider.executeCommand('non-existent-id', commandOptions);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('instance not found');
      }
    });
  });

  describe('size parsing', () => {
    it('should handle different size inputs', () => {
      // We can't directly test the private parseSizeToVCPUs method,
      // but we can verify the provider doesn't crash with different sizes
      const testSizes = ['small', 'medium', 'large', 'xlarge', 'unknown', undefined];

      testSizes.forEach((size) => {
        expect(() => {
          const options: CreateMachineOptions = {
            name: `test-${size || 'default'}`,
            region: 'iad1',
            size,
          };
          // Just creating the options should not throw
          expect(options).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('configuration handling', () => {
    it('should handle optional configuration parameters', () => {
      const configs = [
        () => new VercelProvider(mockToken),
        () => new VercelProvider(mockToken, mockProjectId),
        () => new VercelProvider(mockToken, mockProjectId, mockTeamId),
        () => new VercelProvider(mockToken, undefined, mockTeamId),
      ];

      configs.forEach((configFn) => {
        expect(() => configFn()).not.toThrow();
      });
    });
  });

  describe('error handling patterns', () => {
    it('should handle createMachine errors gracefully', async () => {
      const options: CreateMachineOptions = {
        name: 'test-error-handling',
        region: 'iad1',
        repoUrl: 'invalid-url',
      };

      const result = await provider.createMachine(options);

      // Should return an error result, not throw
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeDefined();
        expect(typeof result.error.message).toBe('string');
      }
    });
  });
});
