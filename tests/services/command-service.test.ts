import { beforeEach, describe, expect, it } from 'bun:test';
import * as commandService from '@/services/command-service';

describe('command-service', () => {
  beforeEach(() => {
    commandService.clearAllCommandHistory();
  });

  describe('command history', () => {
    it('should return empty history for new instance', async () => {
      const history = await commandService.getCommandHistory('test-instance');
      expect(history).toEqual([]);
    });

    it('should clear command history', async () => {
      // For now, we just test the history management functions
      // Actual command execution would require fly CLI to be installed
      commandService.clearCommandHistory('test-instance');
      const history = await commandService.getCommandHistory('test-instance');
      expect(history.length).toBe(0);
    });

    it('should clear all command history', async () => {
      commandService.clearAllCommandHistory();
      const history1 = await commandService.getCommandHistory('instance1');
      const history2 = await commandService.getCommandHistory('instance2');
      expect(history1).toEqual([]);
      expect(history2).toEqual([]);
    });
  });

  // Note: Full command execution tests would require:
  // 1. Mocking child_process.spawn (complex in Bun)
  // 2. Or having fly CLI installed and a real Fly.io instance
  // For now, we focus on testing the history management
});