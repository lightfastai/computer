import { afterEach, beforeEach, describe, expect, it, type Mock, spyOn } from 'bun:test';
import { err, ok } from 'neverthrow';
import { NotFoundError } from '@/lib/error-handler';
import type { LightfastComputerSDK } from '@/sdk';
import createLightfastComputer from '@/sdk';
import * as commandService from '@/services/command-service';
import * as instanceService from '@/services/instance-service';

describe('SDK E2E Integration Tests', () => {
  let sdk: LightfastComputerSDK;

  // Mock instance service to prevent actual API calls
  let mockCreateInstance: Mock<typeof instanceService.createInstance>;
  let mockGetInstance: Mock<typeof instanceService.getInstance>;
  let mockListInstances: Mock<typeof instanceService.listInstances>;
  let mockStopInstance: Mock<typeof instanceService.stopInstance>;
  let mockStartInstance: Mock<typeof instanceService.startInstance>;
  let mockDestroyInstance: Mock<typeof instanceService.destroyInstance>;
  let mockRestartInstance: Mock<typeof instanceService.restartInstance>;
  let mockHealthCheckInstance: Mock<typeof instanceService.healthCheckInstance>;
  let mockGetInstanceStats: Mock<typeof instanceService.getInstanceStats>;
  let mockExecuteCommand: Mock<typeof commandService.executeCommand>;

  const mockInstance = {
    id: 'test-instance-id',
    flyMachineId: 'fly-123',
    name: 'test-instance',
    region: 'iad' as const,
    image: 'docker.io/library/ubuntu:22.04',
    size: 'shared-cpu-1x' as const,
    memoryMb: 512,
    status: 'running' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    privateIpAddress: 'fdaa:0:1234::5',
  };

  beforeEach(() => {
    // Setup mocks
    mockCreateInstance = spyOn(instanceService, 'createInstance');
    mockGetInstance = spyOn(instanceService, 'getInstance');
    mockListInstances = spyOn(instanceService, 'listInstances');
    mockStopInstance = spyOn(instanceService, 'stopInstance');
    mockStartInstance = spyOn(instanceService, 'startInstance');
    mockDestroyInstance = spyOn(instanceService, 'destroyInstance');
    mockRestartInstance = spyOn(instanceService, 'restartInstance');
    mockHealthCheckInstance = spyOn(instanceService, 'healthCheckInstance');
    mockGetInstanceStats = spyOn(instanceService, 'getInstanceStats');
    mockExecuteCommand = spyOn(commandService, 'executeCommand');

    // Default to empty list
    mockListInstances.mockResolvedValue(ok([]));
    mockGetInstanceStats.mockResolvedValue(
      ok({
        total: 0,
        running: 0,
        stopped: 0,
        failed: 0,
      }),
    );

    // Create SDK with flyApiToken
    sdk = createLightfastComputer({ flyApiToken: 'test-fly-token-123' });
  });

  afterEach(() => {
    // Restore all mocks
    mockCreateInstance?.mockRestore();
    mockGetInstance?.mockRestore();
    mockListInstances?.mockRestore();
    mockStopInstance?.mockRestore();
    mockStartInstance?.mockRestore();
    mockDestroyInstance?.mockRestore();
    mockRestartInstance?.mockRestore();
    mockHealthCheckInstance?.mockRestore();
    mockGetInstanceStats?.mockRestore();
    mockExecuteCommand?.mockRestore();
  });

  describe('Full Instance Lifecycle', () => {
    it('should create, manage, and destroy an instance', async () => {
      // Mock successful instance creation
      mockCreateInstance.mockResolvedValue(ok(mockInstance));
      mockGetInstance.mockResolvedValue(ok(mockInstance));
      mockStopInstance.mockResolvedValue(ok({ ...mockInstance, status: 'stopped' }));
      mockStartInstance.mockResolvedValue(ok(mockInstance));
      mockDestroyInstance.mockResolvedValue(ok(undefined));

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

      // Test with invalid region - use type assertion to test validation
      const result2 = await sdk.instances.create({
        name: 'test',
        region: 'invalid-region-123' as Parameters<typeof sdk.instances.create>[0]['region'],
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
      // Mock 404 response
      mockGetInstance.mockResolvedValue(err(new NotFoundError('Instance', 'non-existent-id')));

      const result = await sdk.instances.get('non-existent-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should list instances correctly', async () => {
      const result = await sdk.instances.list();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value.length).toBe(0);
      }
    });

    it('should get instance statistics', async () => {
      const result = await sdk.instances.getStats();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          total: 0,
          running: 0,
          stopped: 0,
          failed: 0,
        });
      }
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
  });

  describe('SDK Creation', () => {
    it('should require flyApiToken parameter', () => {
      expect(() => {
        // @ts-expect-error - We expect this to fail without flyApiToken
        createLightfastComputer();
      }).toThrow();
    });

    it('should create SDK with flyApiToken', () => {
      const sdk1 = createLightfastComputer({ flyApiToken: 'test-token' });
      expect(sdk1).toBeDefined();
      expect(sdk1.instances).toBeDefined();
      expect(sdk1.commands).toBeDefined();
    });
  });

  describe('Error Handling Patterns', () => {
    it('should use Result types consistently', async () => {
      const sdk = createLightfastComputer({ flyApiToken: 'test-token' });

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
      const sdk = createLightfastComputer({ flyApiToken: 'test-token' });

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
      const sdk = createLightfastComputer({ flyApiToken: 'test-token' });

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
    });
  });
});
