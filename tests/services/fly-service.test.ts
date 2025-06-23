import { afterEach, beforeEach, describe, expect, it, type Mock, mock } from 'bun:test';
import { InstanceCreationError } from '@/lib/error-handler';
import { createLogger } from '@/lib/logger';
import * as flyService from '@/services/fly-service';
import type { Logger } from '@/types/logger';

// Create test logger
const testLogger: Logger = createLogger('test');

// Save original fetch
const originalFetch = global.fetch;

// Mock fetch globally
const mockFetch = mock() as Mock<typeof fetch>;
// Create a proper mock that satisfies the fetch interface
const mockFetchWithProperties = Object.assign(mockFetch, {
  preconnect: mock(),
});
global.fetch = mockFetchWithProperties;

// Helper to create proper FlyMachine mock objects
type MockFlyMachine = {
  id?: string;
  name?: string;
  state?: string;
  region?: string;
  image?: string;
  instance_id?: string;
  private_ip?: string;
  config?: {
    image: string;
    guest: {
      cpu_kind: string;
      cpus: number;
      memory_mb: number;
    };
    services: Array<{
      ports: Array<{ port: number; handlers: string[] }>;
      protocol: string;
      internal_port: number;
    }>;
    env: Record<string, string>;
  };
  created_at?: string;
};

const createMockFlyMachine = (overrides: MockFlyMachine = {}) => ({
  id: 'machine-123',
  name: 'test-machine',
  state: 'started',
  region: 'iad',
  image: 'ubuntu-22.04',
  instance_id: 'inst-123',
  private_ip: 'fdaa:0:1234::5',
  config: {
    image: 'ubuntu-22.04',
    guest: {
      cpu_kind: 'shared',
      cpus: 1,
      memory_mb: 512,
    },
    services: [],
    env: {},
  },
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('fly-service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Ensure fetch is mocked
    global.fetch = mockFetchWithProperties;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('createMachine', () => {
    it('should create a machine successfully', async () => {
      const mockMachine = createMockFlyMachine();

      // Mock the createMachine call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMachine,
      } as Response);

      // Mock the waitForMachineReady calls (getMachine)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMachine,
      } as Response);

      const result = await flyService.createMachine(
        {
          name: 'test-machine',
          region: 'iad',
        },
        'test-fly-token-123',
        'lightfast-worker-instances',
        testLogger,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockMachine);
      }
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/machines'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should return error when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => 'Invalid machine configuration',
      } as Response);

      const result = await flyService.createMachine(
        { name: 'test' },
        'test-fly-token-123',
        'lightfast-worker-instances',
        testLogger,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InstanceCreationError);
      }
    });
  });

  describe('getMachine', () => {
    it('should get a machine by id', async () => {
      const mockMachine = createMockFlyMachine();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMachine,
      } as Response);

      const result = await flyService.getMachine(
        'machine-123',
        'test-fly-token-123',
        'lightfast-worker-instances',
        testLogger,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockMachine);
      }
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/machines/machine-123'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });
  });

  describe('destroyMachine', () => {
    it('should destroy a machine', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await flyService.destroyMachine('machine-123', 'test-fly-token-123', 'lightfast-worker-instances', testLogger);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/machines/machine-123'),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });
  });

  describe('parseMachineSize', () => {
    it('should parse machine sizes correctly', () => {
      expect(flyService.parseMachineSize('shared-cpu-1x')).toEqual({
        kind: 'shared',
        cpus: 1,
      });

      expect(flyService.parseMachineSize('performance-2x')).toEqual({
        kind: 'performance',
        cpus: 2,
      });

      expect(flyService.parseMachineSize('unknown-size')).toEqual({
        kind: 'shared',
        cpus: 1,
      });
    });
  });
});
