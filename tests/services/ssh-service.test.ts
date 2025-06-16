import { AppError } from '@/lib/error-handler';
import * as sshService from '@/services/ssh-service';
import { Client } from 'ssh2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock SSH2 Client
vi.mock('ssh2', () => {
  const mockClient = {
    on: vi.fn().mockReturnThis(),
    connect: vi.fn(),
    exec: vi.fn(),
    shell: vi.fn(),
    sftp: vi.fn(),
    end: vi.fn(),
  };

  return {
    Client: vi.fn(() => mockClient),
  };
});

// Mock fs module
vi.mock('node:fs', () => ({
  readFileSync: vi.fn().mockReturnValue('mock-private-key'),
  createReadStream: vi.fn(),
  createWriteStream: vi.fn(),
}));

describe('ssh-service', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new Client();
  });

  afterEach(() => {
    sshService.disconnectAll();
  });

  describe('connect', () => {
    it('should establish SSH connection', async () => {
      mockClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0);
        }
        return mockClient;
      });

      await sshService.connect('instance-123', {
        host: '192.168.1.1',
        username: 'root',
      });

      expect(mockClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: '192.168.1.1',
          port: 22,
          username: 'root',
        }),
      );
    });

    it('should reject on connection error', async () => {
      mockClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Connection failed')), 0);
        }
        return mockClient;
      });

      await expect(sshService.connect('instance-123', { host: '192.168.1.1' })).rejects.toThrow(AppError);
    });
  });

  describe('executeCommand', () => {
    beforeEach(async () => {
      mockClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0);
        }
        return mockClient;
      });

      await sshService.connect('instance-123', {
        host: '192.168.1.1',
        username: 'root',
      });
    });

    it('should execute command successfully', async () => {
      const mockStream = {
        on: vi.fn(),
        stderr: { on: vi.fn() },
      };

      mockClient.exec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, mockStream);

        // Simulate successful command execution
        const closeHandler = mockStream.on.mock.calls.find((call) => call[0] === 'close')?.[1];

        const dataHandler = mockStream.on.mock.calls.find((call) => call[0] === 'data')?.[1];

        if (dataHandler) {
          dataHandler(Buffer.from('command output'));
        }

        if (closeHandler) {
          setTimeout(() => closeHandler(0), 0);
        }
      });

      const result = await sshService.executeCommand('instance-123', 'ls -la');

      expect(result).toEqual({
        stdout: 'command output',
        stderr: '',
        exitCode: 0,
      });
    });

    it('should handle command timeout', async () => {
      const mockStream = {
        on: vi.fn(),
        stderr: { on: vi.fn() },
        end: vi.fn(),
      };

      mockClient.exec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, mockStream);
        // Don't call close handler to simulate timeout
      });

      await expect(sshService.executeCommand('instance-123', 'sleep 10', { timeout: 100 })).rejects.toThrow(
        'Command execution timeout',
      );
    });
  });

  describe('createShellSession', () => {
    beforeEach(async () => {
      mockClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0);
        }
        return mockClient;
      });

      await sshService.connect('instance-123', {
        host: '192.168.1.1',
        username: 'root',
      });
    });

    it('should create shell session', async () => {
      const mockStream = { on: vi.fn() };

      mockClient.shell.mockImplementation((callback: Function) => {
        callback(null, mockStream);
      });

      const stream = await sshService.createShellSession('instance-123');

      expect(stream).toBe(mockStream);
      expect(mockClient.shell).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from instance', async () => {
      mockClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0);
        }
        return mockClient;
      });

      await sshService.connect('instance-123', {
        host: '192.168.1.1',
      });

      sshService.disconnect('instance-123');

      expect(mockClient.end).toHaveBeenCalled();
    });
  });
});
