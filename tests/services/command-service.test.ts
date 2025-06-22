import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import * as child_process from 'node:child_process';
import * as commandService from '@/services/command-service';

describe('command-service', () => {
  beforeEach(() => {
    // Clear command history (no-op in stateless SDK)
    commandService.clearAllCommandHistory();
  });

  describe('command history', () => {
    it('should return empty history for new instance', async () => {
      // Stateless SDK always returns empty history
      const history = await commandService.getCommandHistory('test-instance');
      expect(history).toEqual([]);
    });

    it('should clear command history', async () => {
      // Stateless SDK - clear is a no-op
      commandService.clearCommandHistory('test-instance');
      const history = await commandService.getCommandHistory('test-instance');
      expect(history.length).toBe(0);
    });

    it('should clear all command history', async () => {
      // Stateless SDK - clear is a no-op
      commandService.clearAllCommandHistory();
      const history1 = await commandService.getCommandHistory('instance1');
      const history2 = await commandService.getCommandHistory('instance2');
      expect(history1).toEqual([]);
      expect(history2).toEqual([]);
    });
  });

  describe('executeCommand', () => {
    it('should call fly exec with correct arguments', async () => {
      const mockSpawn = spyOn(child_process, 'spawn');

      // Create a mock child process
      const mockChildProcess = {
        stdout: { on: () => {} },
        stderr: { on: () => {} },
        on: (event: string, callback: (code: number) => void) => {
          if (event === 'close') {
            // Simulate immediate completion with success
            setTimeout(() => callback(0), 0);
          }
        },
        kill: () => {},
      };

      // Cast to unknown first, then to the expected type to satisfy TypeScript
      mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof child_process.spawn>);

      const result = await commandService.executeCommand({
        instanceId: 'test-instance',
        machineId: 'machine-123',
        command: 'ls',
        args: ['-la'],
      });

      expect(result.isOk()).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('fly', [
        'machine',
        'exec',
        'machine-123',
        '-a',
        'lightfast-worker-instances',
        'sh -c "ls -la"',
      ]);

      mockSpawn.mockRestore();
    });

    it('should handle command with no arguments', async () => {
      const mockSpawn = spyOn(child_process, 'spawn');

      const mockChildProcess = {
        stdout: { on: () => {} },
        stderr: { on: () => {} },
        on: (event: string, callback: (code: number) => void) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 0);
          }
        },
        kill: () => {},
      };

      // Cast to unknown first, then to the expected type to satisfy TypeScript
      mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof child_process.spawn>);

      await commandService.executeCommand({
        instanceId: 'test-instance',
        machineId: 'machine-123',
        command: 'pwd',
        args: [],
      });

      expect(mockSpawn).toHaveBeenCalledWith('fly', [
        'machine',
        'exec',
        'machine-123',
        '-a',
        'lightfast-worker-instances',
        'sh -c "pwd"',
      ]);

      mockSpawn.mockRestore();
    });
  });

  // Note: Full integration tests would require:
  // 1. Having fly CLI installed and a real Fly.io instance
  // For now, we focus on testing the argument format and history management
});
