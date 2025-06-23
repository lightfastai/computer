import { afterEach, beforeEach, describe, expect, it, type Mock, spyOn } from 'bun:test';
import { err, ok } from 'neverthrow';
import { AppError, InstanceCreationError, InstanceOperationError, NotFoundError } from '@/lib/error-handler';
import { createLogger } from '@/lib/logger';
import * as flyService from '@/services/fly-service';
import * as instanceService from '@/services/instance-service';
import type { Logger } from '@/types/logger';

// Create test logger
const testLogger: Logger = createLogger();
const TEST_APP_NAME = 'lightfast-worker-instances';
const TEST_FLY_TOKEN = 'test-fly-token-123';

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

describe('instance-service', () => {
  // Mock dependencies - properly typed
  let mockCreateMachine: Mock<typeof flyService.createMachine>;
  let mockGetMachine: Mock<typeof flyService.getMachine>;
  let mockListMachines: Mock<typeof flyService.listMachines>;
  let mockStopMachine: Mock<typeof flyService.stopMachine>;
  let mockStartMachine: Mock<typeof flyService.startMachine>;
  let mockDestroyMachine: Mock<typeof flyService.destroyMachine>;
  let mockRestartMachine: Mock<typeof flyService.restartMachine>;

  beforeEach(() => {
    // Setup mocks
    mockCreateMachine = spyOn(flyService, 'createMachine');
    mockGetMachine = spyOn(flyService, 'getMachine');
    mockListMachines = spyOn(flyService, 'listMachines');
    mockStopMachine = spyOn(flyService, 'stopMachine');
    mockStartMachine = spyOn(flyService, 'startMachine');
    mockDestroyMachine = spyOn(flyService, 'destroyMachine');
    mockRestartMachine = spyOn(flyService, 'restartMachine');

    // Default to empty list for listMachines
    mockListMachines.mockResolvedValue(ok([]));
  });

  afterEach(() => {
    // Restore all mocks
    mockCreateMachine?.mockRestore();
    mockGetMachine?.mockRestore();
    mockListMachines?.mockRestore();
    mockStopMachine?.mockRestore();
    mockStartMachine?.mockRestore();
    mockDestroyMachine?.mockRestore();
    mockRestartMachine?.mockRestore();
  });

  describe('createInstance', () => {
    it('should create an instance successfully', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));

      const result = await instanceService.createInstance(
        {
          name: 'test-instance',
          region: 'iad',
        },
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );

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
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );
    });

    it('should handle fly machine creation failure', async () => {
      const mockError = new InstanceCreationError('Failed to create machine');
      mockCreateMachine.mockResolvedValue(err(mockError));

      const result = await instanceService.createInstance({ name: 'test' }, TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(mockError);
      }

      // In stateless SDK, failed creates don't appear in list
      const listResult = await instanceService.listInstances(TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);
      expect(listResult.isOk()).toBe(true);
      if (listResult.isOk()) {
        expect(listResult.value).toHaveLength(0);
      }
    });
  });

  describe('getInstance', () => {
    it('should get an instance by id', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));

      const createdResult = await instanceService.createInstance(
        { name: 'test' },
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );
      expect(createdResult.isOk()).toBe(true);

      if (createdResult.isOk()) {
        const instanceResult = await instanceService.getInstance(
          createdResult.value.id,
          TEST_FLY_TOKEN,
          TEST_APP_NAME,
          testLogger,
        );
        expect(instanceResult.isOk()).toBe(true);

        if (instanceResult.isOk()) {
          expect(instanceResult.value.id).toBe(createdResult.value.id);
        }
      }
    });

    it('should return NotFoundError for non-existent instance', async () => {
      // Mock 404 response
      mockGetMachine.mockResolvedValue(err(new InstanceOperationError('retrieve', 'instance not found')));

      const result = await instanceService.getInstance('non-existent', TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    it('should update instance status from Fly API', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok({ ...mockFlyMachine, state: 'stopped' }));

      const createdResult = await instanceService.createInstance(
        { name: 'test' },
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );
      expect(createdResult.isOk()).toBe(true);

      if (createdResult.isOk()) {
        // Get instance again, should update status
        const instanceResult = await instanceService.getInstance(
          createdResult.value.id,
          TEST_FLY_TOKEN,
          TEST_APP_NAME,
          testLogger,
        );
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

      const createResult = await instanceService.createInstance(
        { name: 'test' },
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        const stopResult = await instanceService.stopInstance(
          createResult.value.id,
          TEST_FLY_TOKEN,
          TEST_APP_NAME,
          testLogger,
        );
        expect(stopResult.isOk()).toBe(true);

        if (stopResult.isOk()) {
          expect(stopResult.value.status).toBe('stopped');
        }
        expect(mockStopMachine).toHaveBeenCalledWith('fly-123', TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);
      }
    });

    it('should return error if instance is not running', async () => {
      const mockFlyMachine = createMockFlyMachine({ state: 'stopped' });

      mockCreateMachine.mockResolvedValue(ok(createMockFlyMachine({ state: 'started' })));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));

      const createResult = await instanceService.createInstance(
        { name: 'test' },
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        // Force update status by calling getInstance which syncs with fly
        await instanceService.getInstance(createResult.value.id, TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);

        const stopResult = await instanceService.stopInstance(
          createResult.value.id,
          TEST_FLY_TOKEN,
          TEST_APP_NAME,
          testLogger,
        );
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

      const createResult = await instanceService.createInstance(
        { name: 'test' },
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        // getInstance will update status to stopped due to mock
        await instanceService.getInstance(createResult.value.id, TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);

        const startResult = await instanceService.startInstance(
          createResult.value.id,
          TEST_FLY_TOKEN,
          TEST_APP_NAME,
          testLogger,
        );
        expect(startResult.isOk()).toBe(true);

        if (startResult.isOk()) {
          expect(startResult.value.status).toBe('running');
        }
        expect(mockStartMachine).toHaveBeenCalledWith('fly-123', TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);
      }
    });
  });

  describe('destroyInstance', () => {
    it('should destroy an instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));
      mockDestroyMachine.mockResolvedValue(ok(undefined));

      const createResult = await instanceService.createInstance(
        { name: 'test' },
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        const destroyResult = await instanceService.destroyInstance(
          createResult.value.id,
          TEST_FLY_TOKEN,
          TEST_APP_NAME,
          testLogger,
        );
        expect(destroyResult.isOk()).toBe(true);

        expect(mockDestroyMachine).toHaveBeenCalledWith('fly-123', TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);

        // After destroy, machine should not exist
        mockGetMachine.mockResolvedValue(err(new InstanceOperationError('retrieve', 'instance not found')));

        const instanceResult = await instanceService.getInstance(
          createResult.value.id,
          TEST_FLY_TOKEN,
          TEST_APP_NAME,
          testLogger,
        );
        expect(instanceResult.isErr()).toBe(true);

        if (instanceResult.isErr()) {
          expect(instanceResult.error).toBeInstanceOf(NotFoundError);
        }
      }
    });

    it('should handle destroy when instance does not exist', async () => {
      // Mock 404 response from Fly API
      mockDestroyMachine.mockResolvedValue(err(new AppError('Instance not found', 404)));

      const destroyResult = await instanceService.destroyInstance(
        'non-existent',
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );

      // Should return success even if instance doesn't exist
      expect(destroyResult.isOk()).toBe(true);

      // Should call destroyMachine
      expect(mockDestroyMachine).toHaveBeenCalledWith('non-existent', TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);
    });
  });

  describe('healthCheckInstance', () => {
    it('should return true for healthy instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(ok(mockFlyMachine));
      mockGetMachine.mockResolvedValue(ok(mockFlyMachine));

      const createResult = await instanceService.createInstance(
        { name: 'test' },
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        const healthResult = await instanceService.healthCheckInstance(
          createResult.value.id,
          TEST_FLY_TOKEN,
          TEST_APP_NAME,
          testLogger,
        );
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

      const createResult = await instanceService.createInstance(
        { name: 'test' },
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        const healthResult = await instanceService.healthCheckInstance(
          createResult.value.id,
          TEST_FLY_TOKEN,
          TEST_APP_NAME,
          testLogger,
        );
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

      const createResult = await instanceService.createInstance(
        { name: 'test' },
        TEST_FLY_TOKEN,
        TEST_APP_NAME,
        testLogger,
      );
      expect(createResult.isOk()).toBe(true);

      if (createResult.isOk()) {
        const restartResult = await instanceService.restartInstance(
          createResult.value.id,
          TEST_FLY_TOKEN,
          TEST_APP_NAME,
          testLogger,
        );
        expect(restartResult.isOk()).toBe(true);

        expect(mockStopMachine).toHaveBeenCalledWith('fly-123', TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);
        expect(mockStartMachine).toHaveBeenCalledWith('fly-123', TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);

        if (restartResult.isOk()) {
          expect(restartResult.value.status).toBe('running');
        }
      }
    });
  });

  describe('getInstanceStats', () => {
    it('should return correct statistics', async () => {
      const mockFlyMachines = [
        createMockFlyMachine({ id: 'fly-1', name: 'test-1', state: 'started' }),
        createMockFlyMachine({ id: 'fly-2', name: 'test-2', state: 'stopped' }),
        createMockFlyMachine({ id: 'fly-3', name: 'test-3', state: 'started' }),
        createMockFlyMachine({ id: 'fly-4', name: 'test-4', state: 'failed' }),
      ];

      // Mock listMachines to return our test machines
      mockListMachines.mockResolvedValue(ok(mockFlyMachines));

      const statsResult = await instanceService.getInstanceStats(TEST_FLY_TOKEN, TEST_APP_NAME, testLogger);

      expect(statsResult.isOk()).toBe(true);
      if (statsResult.isOk()) {
        expect(statsResult.value).toEqual({
          total: 4,
          running: 2, // 2 started machines
          stopped: 1, // 1 stopped machine
          failed: 1, // 1 failed machine
        });
      }
    });
  });
});
