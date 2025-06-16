import { NotFoundError } from '@/lib/error-handler';
import * as flyService from '@/services/fly-service';
import type { CreateInstanceOptions, Instance, InstanceStatus } from '@/types/index';
import { nanoid } from 'nanoid';
import pino from 'pino';

const log = pino();

// State stores
const instances = new Map<string, Instance>();

// Clear all instances (for testing)
export const clearAllInstances = (): void => {
  instances.clear();
};

// Create a new instance
export const createInstance = async (options: CreateInstanceOptions): Promise<Instance> => {
  const instanceId = nanoid();

  // Create instance record
  const instance: Instance = {
    id: instanceId,
    flyMachineId: '',
    name: options.name || `instance-${Date.now()}`,
    region: options.region || 'iad',
    image: options.image || 'ubuntu-22.04',
    size: options.size || 'shared-cpu-1x',
    memoryMb: options.memoryMb || 512,
    status: 'creating' as InstanceStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: options.metadata,
  };

  instances.set(instanceId, instance);

  try {
    // Create Fly.io machine
    log.info(`Creating Fly machine for instance ${instanceId}...`);
    const flyMachine = await flyService.createMachine(options);

    // Update instance with Fly machine details
    instance.flyMachineId = flyMachine.id;
    instance.privateIpAddress = flyMachine.private_ip;
    instance.status = 'running' as InstanceStatus;
    instance.updatedAt = new Date();

    instances.set(instanceId, instance);

    log.info(`Instance ${instanceId} created successfully`);
    return instance;
  } catch (error) {
    // Mark instance as failed
    instance.status = 'failed' as InstanceStatus;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);

    log.error(`Failed to create instance ${instanceId}:`, error);
    throw error;
  }
};

// Get an instance by ID
export const getInstance = async (instanceId: string): Promise<Instance> => {
  const instance = instances.get(instanceId);

  if (!instance) {
    throw new NotFoundError('Instance', instanceId);
  }

  // Update instance status from Fly.io if needed
  if (instance.flyMachineId && instance.status !== 'destroyed') {
    try {
      const flyMachine = await flyService.getMachine(instance.flyMachineId);

      // Update status based on Fly machine state
      switch (flyMachine.state) {
        case 'started':
        case 'running':
          instance.status = 'running' as InstanceStatus;
          break;
        case 'stopped':
          instance.status = 'stopped' as InstanceStatus;
          break;
        case 'destroyed':
          instance.status = 'destroyed' as InstanceStatus;
          break;
        default:
        // Keep current status
      }

      instance.updatedAt = new Date();
      instances.set(instanceId, instance);
    } catch (error) {
      log.error(`Failed to update instance ${instanceId} status:`, error);
    }
  }

  return instance;
};

// List all instances
export const listInstances = async (): Promise<Instance[]> => {
  // Update all instance statuses
  const instanceArray = Array.from(instances.values());

  // Filter out destroyed instances older than 1 hour
  const activeInstances = instanceArray.filter((instance) => {
    if (instance.status === 'destroyed') {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return instance.updatedAt > hourAgo;
    }
    return true;
  });

  return activeInstances;
};

// Stop an instance
export const stopInstance = async (instanceId: string): Promise<Instance> => {
  const instance = await getInstance(instanceId);

  if (instance.status !== 'running') {
    throw new Error(`Instance ${instanceId} is not running`);
  }

  try {
    await flyService.stopMachine(instance.flyMachineId);

    instance.status = 'stopped' as InstanceStatus;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);

    log.info(`Instance ${instanceId} stopped successfully`);
    return instance;
  } catch (error) {
    log.error(`Failed to stop instance ${instanceId}:`, error);
    throw error;
  }
};

// Start an instance
export const startInstance = async (instanceId: string): Promise<Instance> => {
  const instance = await getInstance(instanceId);

  if (instance.status !== 'stopped') {
    throw new Error(`Instance ${instanceId} is not stopped`);
  }

  try {
    await flyService.startMachine(instance.flyMachineId);

    instance.status = 'running' as InstanceStatus;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);

    log.info(`Instance ${instanceId} started successfully`);
    return instance;
  } catch (error) {
    log.error(`Failed to start instance ${instanceId}:`, error);
    throw error;
  }
};

// Destroy an instance
export const destroyInstance = async (instanceId: string): Promise<void> => {
  const instance = await getInstance(instanceId);

  if (instance.status === 'destroyed') {
    return;
  }

  try {
    instance.status = 'destroying' as InstanceStatus;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);

    // Destroy Fly machine
    await flyService.destroyMachine(instance.flyMachineId);

    instance.status = 'destroyed' as InstanceStatus;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);

    log.info(`Instance ${instanceId} destroyed successfully`);
  } catch (error) {
    instance.status = 'failed' as InstanceStatus;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);
    throw error;
  }
};

// Get instance statistics
export const getInstanceStats = (): {
  total: number;
  running: number;
  stopped: number;
  failed: number;
} => {
  const instanceArray = Array.from(instances.values());

  return {
    total: instanceArray.length,
    running: instanceArray.filter((i) => i.status === 'running').length,
    stopped: instanceArray.filter((i) => i.status === 'stopped').length,
    failed: instanceArray.filter((i) => i.status === 'failed').length,
  };
};

// Health check an instance
export const healthCheckInstance = async (instanceId: string): Promise<boolean> => {
  try {
    const instance = await getInstance(instanceId);

    if (!instance.flyMachineId) {
      return false;
    }

    const flyMachine = await flyService.getMachine(instance.flyMachineId);
    return flyMachine.state === 'started' || flyMachine.state === 'running';
  } catch (error) {
    log.error(`Health check failed for instance ${instanceId}:`, error);
    return false;
  }
};

// Restart an instance
export const restartInstance = async (instanceId: string): Promise<Instance> => {
  const instance = await getInstance(instanceId);

  log.info(`Restarting instance ${instanceId}...`);

  // Stop the instance if running
  if (instance.status === 'running') {
    await stopInstance(instanceId);
    // Wait a bit for stop to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Start the instance
  return startInstance(instanceId);
};
