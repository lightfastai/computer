import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { NotFoundError, InstanceCreationError } from '@/lib/error-handler';
import { setStorage, InMemoryStorage } from '@/lib/storage';
import * as flyService from '@/services/fly-service';
import * as instanceService from '@/services/instance-service';
import { err, ok } from 'neverthrow';

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
    services: Array<{ id: string; ports: number[]; protocol: string; internal_port: number }>;
    env: Record<string, string>;
  };
  created_at?: string;
};

const createMockFlyMachine = (overrides: MockFlyMachine = {}) => ({
  id: 'fly-123',
  name: 'test-instance',
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

// Mock dependencies
const mockCreateMachine = spyOn(flyService, 'createMachine');
const mockGetMachine = spyOn(flyService, 'getMachine');
const mockStopMachine = spyOn(flyService, 'stopMachine');
const mockStartMachine = spyOn(flyService, 'startMachine');
const mockDestroyMachine = spyOn(flyService, 'destroyMachine');

describe('instance-service', () => {
  beforeEach(() => {
    // Reset to fresh in-memory storage for each test
    setStorage(new InMemoryStorage());

    mockCreateMachine.mockClear();
    mockGetMachine.mockClear();
    mockStopMachine.mockClear();
    mockStartMachine.mockClear();
    mockDestroyMachine.mockClear();
    instanceService.clearAllInstances();
  });

  describe('createInstance', () => {
    it('should create an instance successfully', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));

      const result = await instanceService.createInstance({
        name: 'test-instance',
        region: 'iad',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toMatchObject({
          name: 'test-instance',
          region: 'iad',
          status: 'running',
          flyMachineId: 'fly-123',
          privateIpAddress: 'fdaa:0:1234::5',
        });
      }

      expect(flyService.createMachine).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-instance',
          region: 'iad',
        }),
      );
    });

    it('should handle fly machine creation failure', async () => {
      const mockError = new InstanceCreationError('Failed to create machine');
      mockCreateMachine.mockResolvedValue(err(mockError));

      const result = await instanceService.createInstance({ name: 'test' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(mockError);
      }

      const instances = await instanceService.listInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].status).toBe('failed');
    });
  });

  describe('getInstance', () => {
    it('should get an instance by id', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));

      const createdResult = await instanceService.createInstance({ name: 'test' });
      expect(createdResult.isOk()).toBe(true);

      if (createdResult.isOk()) {
        const instanceResult = await instanceService.getInstance(createdResult.value.id);
        expect(instanceResult.isOk()).toBe(true);

        if (instanceResult.isOk()) {
          expect(instanceResult.value.id).toBe(createdResult.value.id);
        }
      }
    });

    it('should return NotFoundError for non-existent instance', async () => {
      const result = await instanceService.getInstance('non-existent');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    it('should update instance status from Fly API', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok({ ...mockFlyMachine, state: 'stopped' }));

      const createdResult = await instanceService.createInstance({ name: 'test' });
      expect(createdResult.isOk()).toBe(true);

      if (createdResult.isOk()) {
        // Get instance again, should update status
        const instanceResult = await instanceService.getInstance(createdResult.value.id);
        expect(instanceResult.isOk()).toBe(true);

        if (instanceResult.isOk()) {
          expect(instanceResult.value.status).toBe('stopped');
        }
      }
    });
  });

  describe('stopInstance', () => {
    it('should stop a running instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));
      mockStopMachine.mockResolvedValue(ok(undefined));

      const createResult = await instanceService.createInstance({ name: 'test' });
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        const stopResult = await instanceService.stopInstance(createResult.value.id);
        expect(stopResult.isOk()).toBe(true);

        if (stopResult.isOk()) {
          expect(stopResult.value.status).toBe('stopped');
        }
        expect(mockStopMachine).toHaveBeenCalledWith('fly-123');
      }
    });

    it('should return error if instance is not running', async () => {
      const mockFlyMachine = createMockFlyMachine({ state: 'stopped' });

      mockCreateMachine.mockResolvedValue(ok(createMockFlyMachine({ state: 'started' })));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));

      const createResult = await instanceService.createInstance({ name: 'test' });
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        // Force update status by calling getInstance which syncs with fly
        await instanceService.getInstance(createResult.value.id);

        const stopResult = await instanceService.stopInstance(createResult.value.id);
        expect(stopResult.isErr()).toBe(true);

        if (stopResult.isErr()) {
          expect(stopResult.error.message).toContain('is not running');
        }
      }
    });
  });

  describe('startInstance', () => {
    it('should start a stopped instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok({ ...mockFlyMachine, state: 'stopped' }));
      mockStartMachine.mockResolvedValue(ok(undefined));

      const createResult = await instanceService.createInstance({ name: 'test' });
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        // getInstance will update status to stopped due to mock
        await instanceService.getInstance(createResult.value.id);

        const startResult = await instanceService.startInstance(createResult.value.id);
        expect(startResult.isOk()).toBe(true);

        if (startResult.isOk()) {
          expect(startResult.value.status).toBe('running');
        }
        expect(mockStartMachine).toHaveBeenCalledWith('fly-123');
      }
    });
  });

  describe('destroyInstance', () => {
    it('should destroy an instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));
      mockDestroyMachine.mockResolvedValue(ok(undefined));

      const createResult = await instanceService.createInstance({ name: 'test' });
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        const destroyResult = await instanceService.destroyInstance(createResult.value.id);
        expect(destroyResult.isOk()).toBe(true);

        expect(mockDestroyMachine).toHaveBeenCalledWith('fly-123');

        const instanceResult = await instanceService.getInstance(createResult.value.id);
        expect(instanceResult.isOk()).toBe(true);

        if (instanceResult.isOk()) {
          expect(instanceResult.value.status).toBe('destroyed');
        }
      }
    });

    it('should destroy failed instance without flyMachineId', async () => {
      const mockError = new InstanceCreationError('Failed to create machine');
      mockCreateMachine.mockResolvedValue(err(mockError));

      const createResult = await instanceService.createInstance({ name: 'test' });
      expect(createResult.isErr()).toBe(true);

      // Get the failed instance from the list
      const instances = await instanceService.listInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].status).toBe('failed');
      expect(instances[0].flyMachineId).toBe('');

      const destroyResult = await instanceService.destroyInstance(instances[0].id);
      expect(destroyResult.isOk()).toBe(true);

      // Should not call flyService.destroyMachine since no flyMachineId
      expect(mockDestroyMachine).not.toHaveBeenCalled();

      const instanceResult = await instanceService.getInstance(instances[0].id);
      expect(instanceResult.isOk()).toBe(true);

      if (instanceResult.isOk()) {
        expect(instanceResult.value.status).toBe('destroyed');
      }
    });
  });

  describe('healthCheckInstance', () => {
    it('should return true for healthy instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));

      const createResult = await instanceService.createInstance({ name: 'test' });
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        const healthResult = await instanceService.healthCheckInstance(createResult.value.id);
        expect(healthResult.isOk()).toBe(true);

        if (healthResult.isOk()) {
          expect(healthResult.value).toBe(true);
        }
      }
    });

    it('should return false for unhealthy instance', async () => {
      const mockFlyMachine = createMockFlyMachine({ state: 'stopped' });

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));

      const createResult = await instanceService.createInstance({ name: 'test' });
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        const healthResult = await instanceService.healthCheckInstance(createResult.value.id);
        expect(healthResult.isOk()).toBe(true);

        if (healthResult.isOk()) {
          expect(healthResult.value).toBe(false);
        }
      }
    });
  });

  describe('restartInstance', () => {
    it('should restart a running instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      // Keep returning running state until we explicitly stop it
      mockGetMachine
        .mockResolvedValueOnce(ok(mockFlyMachine)) // For restart check
        .mockResolvedValueOnce(ok(mockFlyMachine)) // For stop check
        .mockResolvedValueOnce(ok({ ...mockFlyMachine, state: 'stopped' })); // For start check
      mockStopMachine.mockResolvedValue(ok(undefined));
      mockStartMachine.mockResolvedValue(ok(undefined));

      const createResult = await instanceService.createInstance({ name: 'test' });
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        const restartResult = await instanceService.restartInstance(createResult.value.id);
        expect(restartResult.isOk()).toBe(true);

        expect(mockStopMachine).toHaveBeenCalledWith('fly-123');
        expect(mockStartMachine).toHaveBeenCalledWith('fly-123');

        if (restartResult.isOk()) {
          expect(restartResult.value.status).toBe('running');
        }
      }
    });
  });

  describe('getInstanceStats', () => {
    it('should return correct statistics', async () => {
      const mockFlyMachines = [
        createMockFlyMachine({ id: 'fly-1', name: 'test-1', state: 'started', private_ip: 'ip1' }),
        createMockFlyMachine({ id: 'fly-2', name: 'test-2', state: 'stopped', private_ip: 'ip2' }),
        createMockFlyMachine({ id: 'fly-3', name: 'test-3', state: 'started', private_ip: 'ip3' }),
      ];

      mockCreateMachine
        .mockResolvedValueOnce(ok(mockFlyMachines[0]))
        .mockResolvedValueOnce(ok(mockFlyMachines[1]))
        .mockResolvedValueOnce(ok(mockFlyMachines[2]))
        .mockResolvedValueOnce(err(new InstanceCreationError('Failed')));

      // Create instances - they will have initial running status from createMachine
      await instanceService.createInstance({ name: 'test-1' }); // running
      await instanceService.createInstance({ name: 'test-2' }); // running
      await instanceService.createInstance({ name: 'test-3' }); // running

      // One will fail
      const failResult = await instanceService.createInstance({ name: 'test-4' });
      expect(failResult.isErr()).toBe(true); // failed

      const stats = await instanceService.getInstanceStats();

      expect(stats).toEqual({
        total: 4,
        running: 3,
        stopped: 0,
        failed: 1,
      });
    });
  });
});
