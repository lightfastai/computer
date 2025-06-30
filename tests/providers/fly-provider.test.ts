import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { FlyProvider } from '@/providers/fly-provider';
import type { Logger } from '@/types/logger';

const mockLogger: Logger = {
  info: () => {},
  error: () => {},
  debug: () => {},
  warn: () => {},
  level: 'silent',
};

describe('FlyProvider', () => {
  let provider: FlyProvider;
  const mockFlyApiToken = 'test-fly-token';
  const mockAppName = 'test-app';

  beforeEach(() => {
    provider = new FlyProvider(mockFlyApiToken, mockAppName, mockLogger);
  });

  describe('createMachine', () => {
    it('should create a machine successfully', async () => {
      const mockResponse = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'started',
        region: 'iad',
        image: 'ubuntu:22.04',
        instance_id: 'instance-123',
        private_ip: '172.16.0.1',
        config: {
          image: 'ubuntu:22.04',
          guest: {
            cpu_kind: 'shared',
            cpus: 1,
            memory_mb: 512,
          },
          services: [],
          env: {},
        },
        created_at: '2023-01-01T00:00:00Z',
      };

      const mockFetch = spyOn(global, 'fetch');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any);

      // Mock the getMachine call for waitForMachineReady
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any);

      const result = await provider.createMachine({
        name: 'test-instance',
        region: 'iad',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('fly-123');
        expect(result.value.name).toBe('test-instance');
        expect(result.value.state).toBe('started');
        expect(result.value.region).toBe('iad');
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.machines.dev/v1/apps/test-app/machines',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-fly-token',
            'Content-Type': 'application/json',
          },
        }),
      );

      mockFetch.mockRestore();
    });

    it('should handle API errors', async () => {
      const mockFetch = spyOn(global, 'fetch');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: () => Promise.resolve('Invalid machine configuration'),
      } as any);

      const result = await provider.createMachine({
        name: 'test-instance',
        region: 'iad',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('invalid configuration');
      }

      mockFetch.mockRestore();
    });
  });

  describe('getMachine', () => {
    it('should get machine details successfully', async () => {
      const mockResponse = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'started',
        region: 'iad',
        image: 'ubuntu:22.04',
        instance_id: 'instance-123',
        private_ip: '172.16.0.1',
        config: {
          image: 'ubuntu:22.04',
          guest: {
            cpu_kind: 'shared',
            cpus: 1,
            memory_mb: 512,
          },
          services: [],
          env: {},
        },
        created_at: '2023-01-01T00:00:00Z',
      };

      const mockFetch = spyOn(global, 'fetch');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any);

      const result = await provider.getMachine('fly-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('fly-123');
        expect(result.value.name).toBe('test-instance');
        expect(result.value.state).toBe('started');
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.machines.dev/v1/apps/test-app/machines/fly-123',
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-fly-token',
            'Content-Type': 'application/json',
          },
        }),
      );

      mockFetch.mockRestore();
    });

    it('should handle machine not found', async () => {
      const mockFetch = spyOn(global, 'fetch');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Machine not found'),
      } as any);

      const result = await provider.getMachine('non-existent');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('instance not found');
      }

      mockFetch.mockRestore();
    });
  });

  describe('listMachines', () => {
    it('should list machines successfully', async () => {
      const mockResponse = [
        {
          id: 'fly-123',
          name: 'test-instance-1',
          state: 'started',
          region: 'iad',
          image: 'ubuntu:22.04',
          instance_id: 'instance-123',
          private_ip: '172.16.0.1',
          config: {
            image: 'ubuntu:22.04',
            guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 512 },
            services: [],
            env: {},
          },
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 'fly-456',
          name: 'test-instance-2',
          state: 'stopped',
          region: 'iad',
          image: 'ubuntu:22.04',
          instance_id: 'instance-456',
          private_ip: '172.16.0.2',
          config: {
            image: 'ubuntu:22.04',
            guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 512 },
            services: [],
            env: {},
          },
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockFetch = spyOn(global, 'fetch');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any);

      const result = await provider.listMachines();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].id).toBe('fly-123');
        expect(result.value[1].id).toBe('fly-456');
      }

      mockFetch.mockRestore();
    });
  });

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      const mockResponse = {
        stdout: 'Hello World\n',
        stderr: '',
        exit_code: 0,
      };

      const mockFetch = spyOn(global, 'fetch');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any);

      const result = await provider.executeCommand('fly-123', { command: 'echo "Hello World"' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stdout).toBe('Hello World\n');
        expect(result.value.stderr).toBe('');
        expect(result.value.exitCode).toBe(0);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.machines.dev/v1/apps/test-app/machines/fly-123/exec',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-fly-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cmd: 'echo "Hello World"',
            timeout: 30,
          }),
        }),
      );

      mockFetch.mockRestore();
    });

    it('should handle command execution errors', async () => {
      const mockFetch = spyOn(global, 'fetch');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Machine not found'),
        url: 'https://api.machines.dev/v1/apps/test-app/machines/non-existent/exec',
      } as any);

      const result = await provider.executeCommand('non-existent', { command: 'echo test' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Machine not found');
      }

      mockFetch.mockRestore();
    });
  });

  describe('machine lifecycle', () => {
    it('should start machine successfully', async () => {
      const mockMachineResponse = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'started',
        region: 'iad',
        image: 'ubuntu:22.04',
        instance_id: 'instance-123',
        private_ip: '172.16.0.1',
        config: {
          image: 'ubuntu:22.04',
          guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 512 },
          services: [],
          env: {},
        },
        created_at: '2023-01-01T00:00:00Z',
      };

      const mockFetch = spyOn(global, 'fetch');

      // Mock start machine response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as any);

      // Mock getMachine call for waitForMachineReady
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMachineResponse),
      } as any);

      // Mock final getMachine call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMachineResponse),
      } as any);

      const result = await provider.startMachine('fly-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('fly-123');
        expect(result.value.state).toBe('started');
      }

      mockFetch.mockRestore();
    });

    it('should stop machine successfully', async () => {
      const mockMachineResponse = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'stopped',
        region: 'iad',
        image: 'ubuntu:22.04',
        instance_id: 'instance-123',
        private_ip: '172.16.0.1',
        config: {
          image: 'ubuntu:22.04',
          guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 512 },
          services: [],
          env: {},
        },
        created_at: '2023-01-01T00:00:00Z',
      };

      const mockFetch = spyOn(global, 'fetch');

      // Mock stop machine response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as any);

      // Mock getMachine call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMachineResponse),
      } as any);

      const result = await provider.stopMachine('fly-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('fly-123');
        expect(result.value.state).toBe('stopped');
      }

      mockFetch.mockRestore();
    });

    it('should destroy machine successfully', async () => {
      const mockFetch = spyOn(global, 'fetch');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as any);

      const result = await provider.destroyMachine('fly-123');

      expect(result.isOk()).toBe(true);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.machines.dev/v1/apps/test-app/machines/fly-123',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );

      mockFetch.mockRestore();
    });
  });
});
