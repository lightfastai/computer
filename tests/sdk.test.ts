import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { ok, err } from 'neverthrow';
import { ValidationError } from '@/lib/error-handler';
import createLightfastComputer from '@/sdk';
import * as commandService from '@/services/command-service';
import * as instanceService from '@/services/instance-service';

// Mock dependencies
const mockCreateInstance = spyOn(instanceService, 'createInstance');
const mockCreateInstanceWithGitHub = spyOn(instanceService, 'createInstanceWithGitHub');
const mockGetInstance = spyOn(instanceService, 'getInstance');
const mockListInstances = spyOn(instanceService, 'listInstances');
const mockStartInstance = spyOn(instanceService, 'startInstance');
const mockStopInstance = spyOn(instanceService, 'stopInstance');
const mockRestartInstance = spyOn(instanceService, 'restartInstance');
const mockDestroyInstance = spyOn(instanceService, 'destroyInstance');
const mockHealthCheckInstance = spyOn(instanceService, 'healthCheckInstance');
const mockGetInstanceStats = spyOn(instanceService, 'getInstanceStats');
const mockStopAllInstances = spyOn(instanceService, 'stopAllInstances');
const mockDestroyAllInstances = spyOn(instanceService, 'destroyAllInstances');
const mockExecuteCommand = spyOn(commandService, 'executeCommand');

const mockInstance = {
  id: 'test-instance-id',
  flyMachineId: 'fly-123',
  name: 'test-instance',
  region: 'iad',
  image: 'ubuntu-22.04',
  size: 'shared-cpu-1x',
  memoryMb: 512,
  status: 'running' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  privateIpAddress: 'fdaa:0:1234::5',
};

describe('LightfastComputer SDK', () => {
  beforeEach(() => {
    // Clear all mocks
    mockCreateInstance.mockClear();
    mockCreateInstanceWithGitHub.mockClear();
    mockGetInstance.mockClear();
    mockListInstances.mockClear();
    mockStartInstance.mockClear();
    mockStopInstance.mockClear();
    mockRestartInstance.mockClear();
    mockDestroyInstance.mockClear();
    mockHealthCheckInstance.mockClear();
    mockGetInstanceStats.mockClear();
    mockStopAllInstances.mockClear();
    mockDestroyAllInstances.mockClear();
    mockExecuteCommand.mockClear();
  });

  describe('instances', () => {
    it('should create instance without GitHub integration', async () => {
      const sdk = createLightfastComputer();
      mockCreateInstance.mockResolvedValue(ok(mockInstance));

      const result = await sdk.instances.create({ name: 'test' });

      expect(result.isOk()).toBe(true);
      expect(mockCreateInstance).toHaveBeenCalledWith({
        name: 'test',
        region: 'iad',
        image: 'ubuntu-22.04',
        size: 'shared-cpu-1x',
        memoryMb: 512,
      });
      expect(mockCreateInstanceWithGitHub).not.toHaveBeenCalled();
    });

    it('should create instance with GitHub integration', async () => {
      const sdk = createLightfastComputer();
      mockCreateInstanceWithGitHub.mockResolvedValue(ok(mockInstance));

      const result = await sdk.instances.create({
        name: 'test',
        secrets: {
          githubToken: 'ghp_1234567890abcdef1234567890abcdef12345',
          githubUsername: 'testuser',
        },
      });

      expect(result.isOk()).toBe(true);
      expect(mockCreateInstanceWithGitHub).toHaveBeenCalledWith({
        name: 'test',
        region: 'iad',
        image: 'ubuntu-22.04',
        size: 'shared-cpu-1x',
        memoryMb: 512,
        secrets: {
          githubToken: 'ghp_1234567890abcdef1234567890abcdef12345',
          githubUsername: 'testuser',
        },
      });
      expect(mockCreateInstance).not.toHaveBeenCalled();
    });

    it('should get instance by id', async () => {
      const sdk = createLightfastComputer();
      mockGetInstance.mockResolvedValue(ok(mockInstance));

      const result = await sdk.instances.get('test-id');

      expect(result.isOk()).toBe(true);
      expect(mockGetInstance).toHaveBeenCalledWith('test-id');
    });

    it('should validate instance ID in get', async () => {
      const sdk = createLightfastComputer();

      const result = await sdk.instances.get('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Instance ID is required');
      }
      expect(mockGetInstance).not.toHaveBeenCalled();
    });

    it('should list all instances', async () => {
      const sdk = createLightfastComputer();
      mockListInstances.mockResolvedValue(ok([mockInstance]));

      const result = await sdk.instances.list();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toEqual(mockInstance);
      }
      expect(mockListInstances).toHaveBeenCalled();
    });

    it('should start instance', async () => {
      const sdk = createLightfastComputer();
      mockStartInstance.mockResolvedValue(ok(mockInstance));

      const result = await sdk.instances.start('test-id');

      expect(result.isOk()).toBe(true);
      expect(mockStartInstance).toHaveBeenCalledWith('test-id');
    });

    it('should stop instance', async () => {
      const sdk = createLightfastComputer();
      mockStopInstance.mockResolvedValue(ok(mockInstance));

      const result = await sdk.instances.stop('test-id');

      expect(result.isOk()).toBe(true);
      expect(mockStopInstance).toHaveBeenCalledWith('test-id');
    });

    it('should restart instance', async () => {
      const sdk = createLightfastComputer();
      mockRestartInstance.mockResolvedValue(ok(mockInstance));

      const result = await sdk.instances.restart('test-id');

      expect(result.isOk()).toBe(true);
      expect(mockRestartInstance).toHaveBeenCalledWith('test-id');
    });

    it('should destroy instance', async () => {
      const sdk = createLightfastComputer();
      mockDestroyInstance.mockResolvedValue(ok(undefined));

      const result = await sdk.instances.destroy('test-id');

      expect(result.isOk()).toBe(true);
      expect(mockDestroyInstance).toHaveBeenCalledWith('test-id');
    });

    it('should check instance health', async () => {
      const sdk = createLightfastComputer();
      mockHealthCheckInstance.mockResolvedValue(ok(true));

      const result = await sdk.instances.healthCheck('test-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
      expect(mockHealthCheckInstance).toHaveBeenCalledWith('test-id');
    });

    it('should get instance statistics', async () => {
      const sdk = createLightfastComputer();
      const stats = { total: 5, running: 3, stopped: 1, failed: 1 };
      mockGetInstanceStats.mockResolvedValue(ok(stats));

      const result = await sdk.instances.getStats();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(stats);
      }
      expect(mockGetInstanceStats).toHaveBeenCalled();
    });

    it('should handle errors in list instances', async () => {
      const sdk = createLightfastComputer();
      const error = new ValidationError('Failed to list instances');
      mockListInstances.mockResolvedValue(err(error));

      const result = await sdk.instances.list();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should handle errors in getStats', async () => {
      const sdk = createLightfastComputer();
      const error = new ValidationError('Failed to get stats');
      mockGetInstanceStats.mockResolvedValue(err(error));

      const result = await sdk.instances.getStats();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should stop all instances successfully', async () => {
      const sdk = createLightfastComputer();
      const stoppedInstances = [
        { ...mockInstance, status: 'stopped' as const },
        { ...mockInstance, id: 'test-2', status: 'stopped' as const },
      ];
      mockStopAllInstances.mockResolvedValue(ok(stoppedInstances));

      const result = await sdk.instances.stopAll();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].status).toBe('stopped');
      }
      expect(mockStopAllInstances).toHaveBeenCalled();
    });

    it('should destroy all instances successfully', async () => {
      const sdk = createLightfastComputer();
      mockDestroyAllInstances.mockResolvedValue(ok(undefined));

      const result = await sdk.instances.destroyAll();

      expect(result.isOk()).toBe(true);
      expect(mockDestroyAllInstances).toHaveBeenCalled();
    });

    it('should handle errors in stopAll', async () => {
      const sdk = createLightfastComputer();
      const error = new ValidationError('Failed to stop instances');
      mockStopAllInstances.mockResolvedValue(err(error));

      const result = await sdk.instances.stopAll();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should handle errors in destroyAll', async () => {
      const sdk = createLightfastComputer();
      const error = new ValidationError('Failed to destroy instances');
      mockDestroyAllInstances.mockResolvedValue(err(error));

      const result = await sdk.instances.destroyAll();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('commands', () => {
    it('should execute command successfully', async () => {
      const sdk = createLightfastComputer();
      mockGetInstance.mockResolvedValue(ok(mockInstance));
      mockExecuteCommand.mockResolvedValue(
        ok({
          output: 'file1.txt\nfile2.txt',
          error: '',
          exitCode: 0,
        }),
      );

      const result = await sdk.commands.execute({
        instanceId: 'test-id',
        command: 'ls',
        args: ['-la'],
      });

      expect(result.isOk()).toBe(true);
      expect(mockGetInstance).toHaveBeenCalledWith('test-id');
      expect(mockExecuteCommand).toHaveBeenCalledWith({
        instanceId: 'test-id',
        machineId: 'fly-123',
        command: 'ls',
        args: ['-la'],
        timeout: 30000,
        onData: undefined,
        onError: undefined,
      });
    });

    it('should validate instance ID in execute', async () => {
      const sdk = createLightfastComputer();

      const result = await sdk.commands.execute({
        instanceId: '',
        command: 'ls',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Instance ID is required');
      }
      expect(mockGetInstance).not.toHaveBeenCalled();
    });

    it('should validate command in execute', async () => {
      const sdk = createLightfastComputer();

      const result = await sdk.commands.execute({
        instanceId: 'test-id',
        command: '',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Command is required');
      }
      expect(mockGetInstance).not.toHaveBeenCalled();
    });

    it('should validate instance is running', async () => {
      const sdk = createLightfastComputer();
      const stoppedInstance = { ...mockInstance, status: 'stopped' as const };
      mockGetInstance.mockResolvedValue(ok(stoppedInstance));

      const result = await sdk.commands.execute({
        instanceId: 'test-id',
        command: 'ls',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('is not running');
      }
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    it('should validate allowed commands', async () => {
      const sdk = createLightfastComputer();
      mockGetInstance.mockResolvedValue(ok(mockInstance));

      const result = await sdk.commands.execute({
        instanceId: 'test-id',
        command: 'rm -rf /',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('is not allowed');
      }
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });
  });
});
