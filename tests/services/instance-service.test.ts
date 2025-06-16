import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { NotFoundError } from '@/lib/error-handler';
import * as flyService from '@/services/fly-service';
import * as instanceService from '@/services/instance-service';

// Helper to create proper FlyMachine mock objects
const createMockFlyMachine = (overrides: Partial<any> = {}) => ({
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

      mockCreateMachine.mockResolvedValue(mockFlyMachine);
      mockGetMachine.mockResolvedValue(mockFlyMachine);

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
      mockCreateMachine.mockRejectedValue(new Error('Failed to create machine'));

      await expect(instanceService.createInstance({ name: 'test' })).rejects.toThrow('Failed to create machine');

      const instances = await instanceService.listInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].status).toBe('failed');
    });
  });

  describe('getInstance', () => {
    it('should get an instance by id', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(mockFlyMachine);
      mockGetMachine.mockResolvedValue(mockFlyMachine);

      const created = await instanceService.createInstance({ name: 'test' });
      const instance = await instanceService.getInstance(created.id);

      expect(instance.id).toBe(created.id);
    });

    it('should throw NotFoundError for non-existent instance', async () => {
      await expect(instanceService.getInstance('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('should update instance status from Fly API', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(mockFlyMachine);
      mockGetMachine.mockResolvedValue({ ...mockFlyMachine, state: 'stopped' });

      const created = await instanceService.createInstance({ name: 'test' });

      // Get instance again, should update status
      const instance = await instanceService.getInstance(created.id);
      expect(instance.status).toBe('stopped');
    });
  });

  describe('stopInstance', () => {
    it('should stop a running instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(mockFlyMachine);
      mockGetMachine.mockResolvedValue(mockFlyMachine);
      mockStopMachine.mockResolvedValue(undefined);

      const instance = await instanceService.createInstance({ name: 'test' });
      const stopped = await instanceService.stopInstance(instance.id);

      expect(stopped.status).toBe('stopped');
      expect(mockStopMachine).toHaveBeenCalledWith('fly-123');
    });

    it('should throw error if instance is not running', async () => {
      const mockFlyMachine = createMockFlyMachine({ state: 'stopped' });

      mockCreateMachine.mockResolvedValue(createMockFlyMachine({ state: 'started' }));
      mockGetMachine.mockResolvedValue(mockFlyMachine);

      const instance = await instanceService.createInstance({ name: 'test' });

      // Force update status by calling getInstance which syncs with fly
      await instanceService.getInstance(instance.id);

      await expect(instanceService.stopInstance(instance.id)).rejects.toThrow('is not running');
    });
  });

  describe('startInstance', () => {
    it('should start a stopped instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(mockFlyMachine);
      mockGetMachine.mockResolvedValue({ ...mockFlyMachine, state: 'stopped' });
      mockStartMachine.mockResolvedValue(undefined);

      const instance = await instanceService.createInstance({ name: 'test' });
      // getInstance will update status to stopped due to mock
      await instanceService.getInstance(instance.id);

      const started = await instanceService.startInstance(instance.id);

      expect(started.status).toBe('running');
      expect(mockStartMachine).toHaveBeenCalledWith('fly-123');
    });
  });

  describe('destroyInstance', () => {
    it('should destroy an instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(mockFlyMachine);
      mockGetMachine.mockResolvedValue(mockFlyMachine);
      mockDestroyMachine.mockResolvedValue(undefined);

      const instance = await instanceService.createInstance({ name: 'test' });
      await instanceService.destroyInstance(instance.id);

      expect(mockDestroyMachine).toHaveBeenCalledWith('fly-123');

      const updatedInstance = await instanceService.getInstance(instance.id);
      expect(updatedInstance.status).toBe('destroyed');
    });
  });

  describe('healthCheckInstance', () => {
    it('should return true for healthy instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(mockFlyMachine);
      mockGetMachine.mockResolvedValue(mockFlyMachine);

      const instance = await instanceService.createInstance({ name: 'test' });
      const healthy = await instanceService.healthCheckInstance(instance.id);

      expect(healthy).toBe(true);
    });

    it('should return false for unhealthy instance', async () => {
      const mockFlyMachine = {
        id: 'fly-123',
        name: 'test-instance',
        state: 'stopped',
        region: 'iad',
        image: 'ubuntu-22.04',
        private_ip: 'fdaa:0:1234::5',
      };

      mockCreateMachine.mockResolvedValue(mockFlyMachine);
      mockGetMachine.mockResolvedValue(mockFlyMachine);

      const instance = await instanceService.createInstance({ name: 'test' });
      const healthy = await instanceService.healthCheckInstance(instance.id);

      expect(healthy).toBe(false);
    });
  });

  describe('restartInstance', () => {
    it('should restart a running instance', async () => {
      const mockFlyMachine = createMockFlyMachine();

      mockCreateMachine.mockResolvedValue(mockFlyMachine);
      // Keep returning running state until we explicitly stop it
      mockGetMachine
        .mockResolvedValueOnce(mockFlyMachine) // For restart check
        .mockResolvedValueOnce(mockFlyMachine) // For stop check
        .mockResolvedValueOnce({ ...mockFlyMachine, state: 'stopped' }); // For start check
      mockStopMachine.mockResolvedValue(undefined);
      mockStartMachine.mockResolvedValue(undefined);

      const instance = await instanceService.createInstance({ name: 'test' });
      const restarted = await instanceService.restartInstance(instance.id);

      expect(mockStopMachine).toHaveBeenCalledWith('fly-123');
      expect(mockStartMachine).toHaveBeenCalledWith('fly-123');
      expect(restarted.status).toBe('running');
    });
  });

  describe('getInstanceStats', () => {
    it('should return correct statistics', async () => {
      const mockFlyMachines = [
        { id: 'fly-1', name: 'test-1', state: 'started', region: 'iad', image: 'ubuntu-22.04', private_ip: 'ip1' },
        { id: 'fly-2', name: 'test-2', state: 'stopped', region: 'iad', image: 'ubuntu-22.04', private_ip: 'ip2' },
        { id: 'fly-3', name: 'test-3', state: 'started', region: 'iad', image: 'ubuntu-22.04', private_ip: 'ip3' },
      ];

      mockCreateMachine
        .mockResolvedValueOnce(mockFlyMachines[0])
        .mockResolvedValueOnce(mockFlyMachines[1])
        .mockResolvedValueOnce(mockFlyMachines[2])
        .mockRejectedValueOnce(new Error('Failed'));

      // Create instances - they will have initial running status from createMachine
      await instanceService.createInstance({ name: 'test-1' }); // running
      await instanceService.createInstance({ name: 'test-2' }); // running
      await instanceService.createInstance({ name: 'test-3' }); // running

      // One will fail
      await instanceService.createInstance({ name: 'test-4' }).catch(() => {}); // failed

      const stats = instanceService.getInstanceStats();

      expect(stats).toEqual({
        total: 4,
        running: 3,
        stopped: 0,
        failed: 1,
      });
    });
  });
});
