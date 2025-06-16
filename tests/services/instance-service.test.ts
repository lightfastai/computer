import { NotFoundError } from '@/lib/error-handler';
import * as flyService from '@/services/fly-service';
import * as instanceService from '@/services/instance-service';
import * as sshService from '@/services/ssh-service';
import type { CommandStatus, InstanceStatus } from '@/types/index';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/services/fly-service');
vi.mock('@/services/ssh-service');

describe('instance-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    instanceService.clearAllInstances();
  });

  describe('createInstance', () => {
    it('should create an instance successfully', async () => {
      const mockFlyMachine = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'started',
        region: 'iad',
        private_ip: 'fdaa:0:1234::5',
      };

      vi.mocked(flyService.createMachine).mockResolvedValue(mockFlyMachine);

      const instance = await instanceService.createInstance({
        name: 'test-instance',
        region: 'iad',
      });

      expect(instance).toMatchObject({
        name: 'test-instance',
        region: 'iad',
        status: 'running',
        flyMachineId: 'fly-123',
        privateIpAddress: 'fdaa:0:1234::5',
      });

      expect(flyService.createMachine).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-instance',
          region: 'iad',
        }),
      );
    });

    it('should handle fly machine creation failure', async () => {
      vi.mocked(flyService.createMachine).mockRejectedValue(new Error('Failed to create machine'));

      await expect(instanceService.createInstance({ name: 'test' })).rejects.toThrow('Failed to create machine');

      const instances = await instanceService.listInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].status).toBe('failed');
    });
  });

  describe('getInstance', () => {
    it('should get an instance by id', async () => {
      const mockFlyMachine = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'started',
        region: 'iad',
        private_ip: 'fdaa:0:1234::5',
      };

      vi.mocked(flyService.createMachine).mockResolvedValue(mockFlyMachine);

      const created = await instanceService.createInstance({ name: 'test' });
      const instance = await instanceService.getInstance(created.id);

      expect(instance.id).toBe(created.id);
    });

    it('should throw NotFoundError for non-existent instance', async () => {
      await expect(instanceService.getInstance('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('destroyInstance', () => {
    it('should destroy an instance', async () => {
      const mockFlyMachine = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'started',
        region: 'iad',
        private_ip: 'fdaa:0:1234::5',
      };

      vi.mocked(flyService.createMachine).mockResolvedValue(mockFlyMachine);
      vi.mocked(flyService.destroyMachine).mockResolvedValue(undefined);

      const instance = await instanceService.createInstance({ name: 'test' });
      await instanceService.destroyInstance(instance.id);

      expect(flyService.destroyMachine).toHaveBeenCalledWith('fly-123');
      expect(sshService.disconnect).toHaveBeenCalledWith(instance.id);

      const updatedInstance = await instanceService.getInstance(instance.id);
      expect(updatedInstance.status).toBe('destroyed');
    });
  });

  describe('executeCommand', () => {
    it('should execute command on running instance', async () => {
      const mockFlyMachine = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'started',
        region: 'iad',
        private_ip: 'fdaa:0:1234::5',
      };

      vi.mocked(flyService.createMachine).mockResolvedValue(mockFlyMachine);
      vi.mocked(sshService.isConnected).mockReturnValue(true);
      vi.mocked(sshService.executeCommand).mockResolvedValue({
        stdout: 'command output',
        stderr: '',
        exitCode: 0,
      });

      const instance = await instanceService.createInstance({ name: 'test' });
      const result = await instanceService.executeCommand(instance.id, 'ls -la');

      expect(result).toMatchObject({
        instanceId: instance.id,
        command: 'ls -la',
        status: 'completed',
        output: 'command output',
        exitCode: 0,
      });
    });

    it('should establish SSH connection if not connected', async () => {
      const mockFlyMachine = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'started',
        region: 'iad',
        private_ip: 'fdaa:0:1234::5',
      };

      vi.mocked(flyService.createMachine).mockResolvedValue(mockFlyMachine);
      vi.mocked(sshService.isConnected).mockReturnValue(false);
      vi.mocked(sshService.connect).mockResolvedValue(undefined);
      vi.mocked(sshService.executeCommand).mockResolvedValue({
        stdout: 'output',
        stderr: '',
        exitCode: 0,
      });

      const instance = await instanceService.createInstance({ name: 'test' });
      await instanceService.executeCommand(instance.id, 'echo test');

      expect(sshService.connect).toHaveBeenCalledWith(
        instance.id,
        expect.objectContaining({
          host: 'fdaa:0:1234::5',
          username: 'root',
        }),
      );
    });

    it('should throw error if instance is not running', async () => {
      const mockFlyMachine = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'stopped',
        region: 'iad',
        private_ip: 'fdaa:0:1234::5',
      };

      vi.mocked(flyService.createMachine).mockResolvedValue(mockFlyMachine);
      vi.mocked(flyService.getMachine).mockResolvedValue({
        ...mockFlyMachine,
        state: 'stopped',
      });

      const instance = await instanceService.createInstance({ name: 'test' });

      // Force update status
      await instanceService.getInstance(instance.id);

      await expect(instanceService.executeCommand(instance.id, 'ls')).rejects.toThrow('Instance');
    });
  });
});
