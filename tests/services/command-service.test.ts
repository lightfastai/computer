import { afterEach, beforeEach, describe, expect, it, type Mock, mock } from 'bun:test';
import { createLogger } from '@/lib/logger';
import * as commandService from '@/services/command-service';

describe('command-service', () => {
  describe('executeCommand', () => {
    let mockFetch: Mock<typeof fetch>;
    const mockLogger = createLogger();
    const testAppName = 'test-app';

    beforeEach(() => {
      mockFetch = mock() as Mock<typeof fetch>;
      global.fetch = mockFetch;
    });

    afterEach(() => {
      mockFetch.mockClear();
    });

    it('should execute command via REST API with correct arguments', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          stdout: 'total 8\ndrwxr-xr-x 2 root root\n',
          stderr: '',
          exit_code: 0,
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await commandService.executeCommand(
        {
          instanceId: 'test-instance',
          machineId: 'machine-123',
          command: 'ls',
          args: ['-la'],
        },
        'test-fly-token-123',
        testAppName,
        mockLogger,
      );

      expect(result.isOk()).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.machines.dev/v1/apps/test-app/machines/machine-123/exec',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-fly-token-123',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            cmd: ['sh', '-c', 'ls -la'],
            timeout: 30000,
          }),
        }),
      );
    });

    it('should handle command with no arguments', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          stdout: '/workspace\n',
          stderr: '',
          exit_code: 0,
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await commandService.executeCommand(
        {
          instanceId: 'test-instance',
          machineId: 'machine-123',
          command: 'pwd',
          args: [],
        },
        'test-fly-token-123',
        testAppName,
        mockLogger,
      );

      expect(result.isOk()).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.machines.dev/v1/apps/test-app/machines/machine-123/exec',
        expect.objectContaining({
          body: JSON.stringify({
            cmd: ['sh', '-c', 'pwd'],
            timeout: 30000,
          }),
        }),
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: async () => 'Machine not found',
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await commandService.executeCommand(
        {
          instanceId: 'test-instance',
          machineId: 'non-existent',
          command: 'echo',
          args: ['test'],
        },
        'test-fly-token-123',
        testAppName,
        mockLogger,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Failed to execute instance: Machine not found');
      }
    });

    it('should handle callbacks', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          stdout: 'Output data',
          stderr: 'Error data',
          exit_code: 0,
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      let capturedOutput = '';
      let capturedError = '';

      await commandService.executeCommand(
        {
          instanceId: 'test-instance',
          machineId: 'machine-123',
          command: 'test',
          args: [],
          onData: (data) => {
            capturedOutput = data;
          },
          onError: (error) => {
            capturedError = error;
          },
        },
        'test-fly-token-123',
        testAppName,
        mockLogger,
      );

      expect(capturedOutput).toBe('Output data');
      expect(capturedError).toBe('Error data');
    });
  });
});
