import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryStorage, type CommandExecution } from '@/lib/storage';
import type { Instance } from '@/types/index';

const mockInstance: Instance = {
  id: 'test-instance-id',
  flyMachineId: 'fly-123',
  name: 'test-instance',
  region: 'iad',
  image: 'ubuntu-22.04',
  size: 'shared-cpu-1x',
  memoryMb: 512,
  status: 'running',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  privateIpAddress: 'fdaa:0:1234::5',
};

const mockCommand: CommandExecution = {
  id: 'cmd-123',
  instanceId: 'test-instance-id',
  command: 'ls',
  args: ['-la'],
  output: 'file1.txt\nfile2.txt',
  error: '',
  exitCode: 0,
  startedAt: new Date('2024-01-01T00:00:00Z'),
  completedAt: new Date('2024-01-01T00:00:00Z'),
  status: 'completed',
};

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  describe('instance operations', () => {
    it('should save and retrieve instance', async () => {
      const saveResult = await storage.saveInstance(mockInstance);
      expect(saveResult.isOk()).toBe(true);

      const getResult = await storage.getInstance('test-instance-id');
      expect(getResult.isOk()).toBe(true);

      if (getResult.isOk()) {
        expect(getResult.value).toEqual(mockInstance);
      }
    });

    it('should return null for non-existent instance', async () => {
      const getResult = await storage.getInstance('non-existent');
      expect(getResult.isOk()).toBe(true);

      if (getResult.isOk()) {
        expect(getResult.value).toBeNull();
      }
    });

    it('should list instances', async () => {
      await storage.saveInstance(mockInstance);
      await storage.saveInstance({ ...mockInstance, id: 'test-2', name: 'test-2' });

      const listResult = await storage.listInstances();
      expect(listResult.isOk()).toBe(true);

      if (listResult.isOk()) {
        expect(listResult.value).toHaveLength(2);
        expect(listResult.value.map(i => i.id)).toContain('test-instance-id');
        expect(listResult.value.map(i => i.id)).toContain('test-2');
      }
    });

    it('should filter out old destroyed instances', async () => {
      const destroyedInstance = {
        ...mockInstance,
        id: 'destroyed-instance',
        status: 'destroyed' as const,
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };

      await storage.saveInstance(mockInstance);
      await storage.saveInstance(destroyedInstance);

      const listResult = await storage.listInstances();
      expect(listResult.isOk()).toBe(true);

      if (listResult.isOk()) {
        expect(listResult.value).toHaveLength(1);
        expect(listResult.value[0].id).toBe('test-instance-id');
      }
    });

    it('should update instance status', async () => {
      await storage.saveInstance(mockInstance);

      const updateResult = await storage.updateInstanceStatus('test-instance-id', 'stopped');
      expect(updateResult.isOk()).toBe(true);

      const getResult = await storage.getInstance('test-instance-id');
      expect(getResult.isOk()).toBe(true);

      if (getResult.isOk() && getResult.value) {
        expect(getResult.value.status).toBe('stopped');
        expect(getResult.value.updatedAt.getTime()).toBeGreaterThan(mockInstance.updatedAt.getTime());
      }
    });

    it('should delete instance and its command history', async () => {
      await storage.saveInstance(mockInstance);
      await storage.saveCommandExecution(mockCommand);

      const deleteResult = await storage.deleteInstance('test-instance-id');
      expect(deleteResult.isOk()).toBe(true);

      const getResult = await storage.getInstance('test-instance-id');
      expect(getResult.isOk()).toBe(true);
      if (getResult.isOk()) {
        expect(getResult.value).toBeNull();
      }

      const historyResult = await storage.getCommandHistory('test-instance-id');
      expect(historyResult.isOk()).toBe(true);
      if (historyResult.isOk()) {
        expect(historyResult.value).toHaveLength(0);
      }
    });
  });

  describe('command operations', () => {
    it('should save and retrieve command execution', async () => {
      const saveResult = await storage.saveCommandExecution(mockCommand);
      expect(saveResult.isOk()).toBe(true);

      const historyResult = await storage.getCommandHistory('test-instance-id');
      expect(historyResult.isOk()).toBe(true);

      if (historyResult.isOk()) {
        expect(historyResult.value).toHaveLength(1);
        expect(historyResult.value[0]).toEqual(mockCommand);
      }
    });

    it('should return empty history for instance with no commands', async () => {
      const historyResult = await storage.getCommandHistory('non-existent');
      expect(historyResult.isOk()).toBe(true);

      if (historyResult.isOk()) {
        expect(historyResult.value).toHaveLength(0);
      }
    });

    it('should limit command history to 100 entries', async () => {
      // Add 101 commands
      for (let i = 0; i < 101; i++) {
        await storage.saveCommandExecution({
          ...mockCommand,
          id: `cmd-${i}`,
          command: `command-${i}`,
        });
      }

      const historyResult = await storage.getCommandHistory('test-instance-id');
      expect(historyResult.isOk()).toBe(true);

      if (historyResult.isOk()) {
        expect(historyResult.value).toHaveLength(100);
        // Should have removed the first command
        expect(historyResult.value[0].id).toBe('cmd-1');
        expect(historyResult.value[99].id).toBe('cmd-100');
      }
    });

    it('should clear command history for specific instance', async () => {
      await storage.saveCommandExecution(mockCommand);
      await storage.saveCommandExecution({
        ...mockCommand,
        id: 'cmd-2',
        instanceId: 'other-instance',
      });

      const clearResult = await storage.clearCommandHistory('test-instance-id');
      expect(clearResult.isOk()).toBe(true);

      const historyResult = await storage.getCommandHistory('test-instance-id');
      expect(historyResult.isOk()).toBe(true);
      if (historyResult.isOk()) {
        expect(historyResult.value).toHaveLength(0);
      }

      // Other instance should still have history
      const otherHistoryResult = await storage.getCommandHistory('other-instance');
      expect(otherHistoryResult.isOk()).toBe(true);
      if (otherHistoryResult.isOk()) {
        expect(otherHistoryResult.value).toHaveLength(1);
      }
    });

    it('should clear all command history', async () => {
      await storage.saveCommandExecution(mockCommand);
      await storage.saveCommandExecution({
        ...mockCommand,
        id: 'cmd-2',
        instanceId: 'other-instance',
      });

      const clearResult = await storage.clearAllCommandHistory();
      expect(clearResult.isOk()).toBe(true);

      const historyResult1 = await storage.getCommandHistory('test-instance-id');
      const historyResult2 = await storage.getCommandHistory('other-instance');

      expect(historyResult1.isOk()).toBe(true);
      expect(historyResult2.isOk()).toBe(true);

      if (historyResult1.isOk() && historyResult2.isOk()) {
        expect(historyResult1.value).toHaveLength(0);
        expect(historyResult2.value).toHaveLength(0);
      }
    });
  });

  describe('cleanup operations', () => {
    it('should cleanup old destroyed instances', async () => {
      const oldDestroyed = {
        ...mockInstance,
        id: 'old-destroyed',
        status: 'destroyed' as const,
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };

      const recentDestroyed = {
        ...mockInstance,
        id: 'recent-destroyed',
        status: 'destroyed' as const,
        updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };

      await storage.saveInstance(mockInstance);
      await storage.saveInstance(oldDestroyed);
      await storage.saveInstance(recentDestroyed);

      // Add command history for all instances
      for (const instance of [mockInstance, oldDestroyed, recentDestroyed]) {
        await storage.saveCommandExecution({
          ...mockCommand,
          id: `cmd-${instance.id}`,
          instanceId: instance.id,
        });
      }

      const cleanupResult = await storage.cleanup();
      expect(cleanupResult.isOk()).toBe(true);

      // Check remaining instances
      const runningResult = await storage.getInstance('test-instance-id');
      const recentResult = await storage.getInstance('recent-destroyed');
      const oldResult = await storage.getInstance('old-destroyed');

      expect(runningResult.isOk()).toBe(true);
      expect(recentResult.isOk()).toBe(true);
      expect(oldResult.isOk()).toBe(true);

      if (runningResult.isOk() && recentResult.isOk() && oldResult.isOk()) {
        expect(runningResult.value).not.toBeNull();
        expect(recentResult.value).not.toBeNull();
        expect(oldResult.value).toBeNull(); // Should be cleaned up
      }

      // Check command history cleanup
      const oldHistoryResult = await storage.getCommandHistory('old-destroyed');
      expect(oldHistoryResult.isOk()).toBe(true);
      if (oldHistoryResult.isOk()) {
        expect(oldHistoryResult.value).toHaveLength(0);
      }
    });
  });

  describe('testing utilities', () => {
    it('should provide clearAllInstances for testing', () => {
      storage.saveInstance(mockInstance);
      storage.saveCommandExecution(mockCommand);

      expect(storage.getInstanceCount()).toBe(1);

      storage.clearAllInstances();

      expect(storage.getInstanceCount()).toBe(0);
    });

    it('should track instance count', async () => {
      expect(storage.getInstanceCount()).toBe(0);

      await storage.saveInstance(mockInstance);
      expect(storage.getInstanceCount()).toBe(1);

      await storage.saveInstance({ ...mockInstance, id: 'test-2' });
      expect(storage.getInstanceCount()).toBe(2);

      await storage.deleteInstance('test-instance-id');
      expect(storage.getInstanceCount()).toBe(1);
    });
  });
});