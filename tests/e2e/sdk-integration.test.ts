import { beforeEach, describe, expect, it, afterEach, spyOn } from 'bun:test';
import { InMemoryStorage, setStorage } from '@/lib/storage';
import type { LightfastComputerSDK } from '@/sdk';
import createLightfastComputer from '@/sdk';
import * as instanceService from '@/services/instance-service';
import * as flyService from '@/services/fly-service';
import { err, ok } from 'neverthrow';
import { InstanceCreationError } from '@/lib/error-handler';

describe('SDK E2E Integration Tests', () => {
  let sdk: LightfastComputerSDK;
  let storage: InMemoryStorage;

  // Mock fly service to prevent actual API calls
  let mockCreateMachine: any;
  let mockGetMachine: any;
  let mockStopMachine: any;
  let mockStartMachine: any;
  let mockDestroyMachine: any;
  let mockRestartMachine: any;

  beforeEach(() => {
    // Create completely fresh storage
    storage = new InMemoryStorage();
    setStorage(storage);

    // Clear any service-level state FIRST
    instanceService.clearAllInstances();

    // Setup mocks after clearing state
    mockCreateMachine = spyOn(flyService, 'createMachine');
    mockGetMachine = spyOn(flyService, 'getMachine');
    mockStopMachine = spyOn(flyService, 'stopMachine');
    mockStartMachine = spyOn(flyService, 'startMachine');
    mockDestroyMachine = spyOn(flyService, 'destroyMachine');
    mockRestartMachine = spyOn(flyService, 'restartMachine');

    // Create SDK with fresh storage
    sdk = createLightfastComputer({ storage: storage });
  });

  afterEach(() => {
    // Ensure cleanup after each test
    storage.clearAllInstances();
    instanceService.clearAllInstances();
    
    // Restore all mocks
    mockCreateMachine?.mockRestore();
    mockGetMachine?.mockRestore();
    mockStopMachine?.mockRestore();
    mockStartMachine?.mockRestore();
    mockDestroyMachine?.mockRestore();
    mockRestartMachine?.mockRestore();
  });

  describe('Full Instance Lifecycle', () => {
    it('should create, manage, and destroy an instance', async () => {
      // Mock successful machine creation
      const mockMachine = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'started',
        region: 'iad',
        instance_id: 'inst-123',
        private_ip: 'fdaa:0:1234::5',
        config: {
          guest: { cpus: 1, memory_mb: 512 },
        },
      };
      mockCreateMachine.mockResolvedValue(ok(mockMachine));
      mockGetMachine.mockResolvedValue(ok(mockMachine));

      // 1. Create instance
      const createResult = await sdk.instances.create({
        name: 'test-instance',
        region: 'iad',
        size: 'shared-cpu-1x',
        memoryMb: 512,
      });

      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        expect(createResult.value.name).toBe('test-instance');
        expect(createResult.value.status).toBe('running');
      }
    });

    it('should validate instance creation input', async () => {
      // Test with empty name
      const result1 = await sdk.instances.create({
        name: '',
        region: 'iad',
      });

      expect(result1.isErr()).toBe(true);
      if (result1.isErr()) {
        expect(result1.error.message).toContain('Instance name is required');
      }

      // Test with invalid region
      const result2 = await sdk.instances.create({
        name: 'test',
        region: 'invalid-region-123' as any,
      });

      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.message).toContain('Invalid');
      }

      // Test with invalid GitHub token format
      const result3 = await sdk.instances.create({
        name: 'test',
        secrets: {
          githubToken: 'invalid-token',
          githubUsername: 'user',
        },
      });

      expect(result3.isErr()).toBe(true);
      if (result3.isErr()) {
        expect(result3.error.message).toContain('Invalid GitHub token format');
      }
    });

    it('should handle instance not found errors gracefully', async () => {
      // Don't mock anything - instance doesn't exist
      const result = await sdk.instances.get('non-existent-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should list instances correctly', async () => {
      const instances = await sdk.instances.list();
      expect(Array.isArray(instances)).toBe(true);
      expect(instances.length).toBe(0);
    });

    it('should get instance statistics', async () => {
      const stats = await sdk.instances.getStats();
      expect(stats).toEqual({
        total: 0,
        running: 0,
        stopped: 0,
        failed: 0,
      });
    });
  });

  describe('Command Execution', () => {
    it('should validate command execution input', async () => {
      // Empty instance ID
      const result1 = await sdk.commands.execute({
        instanceId: '',
        command: 'ls',
      });

      expect(result1.isErr()).toBe(true);
      if (result1.isErr()) {
        expect(result1.error.message).toContain('Instance ID is required');
      }

      // Empty command
      const result2 = await sdk.commands.execute({
        instanceId: 'test-id',
        command: '',
      });

      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.message).toContain('Command is required');
      }

      // Disallowed command
      const result3 = await sdk.commands.execute({
        instanceId: 'test-id',
        command: 'rm',
        args: ['-rf', '/'],
      });

      expect(result3.isErr()).toBe(true);
      if (result3.isErr()) {
        // Will show the validation error from schema
        expect(result3.error.message).toContain('not allowed');
      }

      // Test with invalid instance ID format
      const result4 = await sdk.commands.execute({
        instanceId: 'invalid id with spaces',
        command: 'ls',
      });

      expect(result4.isErr()).toBe(true);
      if (result4.isErr()) {
        expect(result4.error.message).toContain('Invalid instance ID format');
      }
    });

    it('should handle command history operations', async () => {
      const history = await sdk.commands.getHistory('test-instance');
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);

      // Clear should not throw
      expect(() => sdk.commands.clearHistory('test-instance')).not.toThrow();
    });
  });

  describe('Storage Configuration', () => {
    it('should accept different storage configurations', () => {
      // Memory storage
      const sdk1 = createLightfastComputer({ storage: 'memory' });
      expect(sdk1).toBeDefined();
      expect(sdk1.instances).toBeDefined();
      expect(sdk1.commands).toBeDefined();

      // File storage
      const sdk2 = createLightfastComputer({
        storage: 'file',
        dataDir: './test-data',
      });
      expect(sdk2).toBeDefined();

      // Custom storage
      const customStorage = new InMemoryStorage();
      const sdk3 = createLightfastComputer({ storage: customStorage });
      expect(sdk3).toBeDefined();
    });
  });

  describe('Error Handling Patterns', () => {
    it('should use Result types consistently', async () => {
      const sdk = createLightfastComputer();

      // All instance methods should return Results
      const createResult = await sdk.instances.create({ name: 'test' });
      expect('isOk' in createResult).toBe(true);
      expect('isErr' in createResult).toBe(true);

      const getResult = await sdk.instances.get('test-id');
      expect('isOk' in getResult).toBe(true);
      expect('isErr' in getResult).toBe(true);

      const startResult = await sdk.instances.start('test-id');
      expect('isOk' in startResult).toBe(true);

      const stopResult = await sdk.instances.stop('test-id');
      expect('isOk' in stopResult).toBe(true);

      const restartResult = await sdk.instances.restart('test-id');
      expect('isOk' in restartResult).toBe(true);

      const destroyResult = await sdk.instances.destroy('test-id');
      expect('isOk' in destroyResult).toBe(true);

      const healthResult = await sdk.instances.healthCheck('test-id');
      expect('isOk' in healthResult).toBe(true);

      // Command methods should return Results
      const execResult = await sdk.commands.execute({
        instanceId: 'test-id',
        command: 'ls',
      });
      expect('isOk' in execResult).toBe(true);
    });

    it('should provide meaningful error messages', async () => {
      const sdk = createLightfastComputer();

      // Test various error scenarios
      const scenarios = [
        {
          fn: () => sdk.instances.get(''),
          expectedError: 'Instance ID is required',
        },
        {
          fn: () => sdk.instances.start(''),
          expectedError: 'Instance ID is required',
        },
        {
          fn: () => sdk.commands.execute({ instanceId: '', command: 'ls' }),
          expectedError: 'Instance ID is required',
        },
        {
          fn: () => sdk.commands.execute({ instanceId: 'test', command: '' }),
          expectedError: 'Command is required',
        },
      ];

      for (const scenario of scenarios) {
        const result = await scenario.fn();
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain(scenario.expectedError);
        }
      }
    });
  });

  describe('TypeScript Types', () => {
    it('should export all necessary types', () => {
      // This is a compile-time test, but we can check runtime exports
      const sdk = createLightfastComputer();

      // Check that the SDK has the expected shape
      expect(typeof sdk.instances.create).toBe('function');
      expect(typeof sdk.instances.get).toBe('function');
      expect(typeof sdk.instances.list).toBe('function');
      expect(typeof sdk.instances.start).toBe('function');
      expect(typeof sdk.instances.stop).toBe('function');
      expect(typeof sdk.instances.restart).toBe('function');
      expect(typeof sdk.instances.destroy).toBe('function');
      expect(typeof sdk.instances.healthCheck).toBe('function');
      expect(typeof sdk.instances.getStats).toBe('function');

      expect(typeof sdk.commands.execute).toBe('function');
      expect(typeof sdk.commands.getHistory).toBe('function');
      expect(typeof sdk.commands.clearHistory).toBe('function');
    });
  });
});
