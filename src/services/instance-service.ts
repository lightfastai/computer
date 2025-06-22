import { nanoid } from 'nanoid';
import { err, ok, type Result } from 'neverthrow';
import pino from 'pino';
import { AppError, NotFoundError } from '@/lib/error-handler';
import * as flyService from '@/services/fly-service';
import type { CreateInstanceOptions, Instance, InstanceStatus } from '@/types/index';

const log = pino();

// State stores
const instances = new Map<string, Instance>();

// Clear all instances (for testing)
export const clearAllInstances = (): void => {
  instances.clear();
};

// Create instance with GitHub integration
export const createInstanceWithGitHub = async (options: CreateInstanceOptions): Promise<Result<Instance, AppError>> => {
  // If GitHub secrets provided, set them at app level first
  if (options.secrets?.githubToken) {
    const secretsResult = await flyService.setAppSecrets({
      GITHUB_TOKEN: options.secrets.githubToken,
      GITHUB_USERNAME: options.secrets.githubUsername || 'x-access-token',
    });

    if (secretsResult.isErr()) {
      return err(secretsResult.error);
    }
  }

  // Create the instance with proper configuration
  return createInstance(options);
};

// Create a new instance
export const createInstance = async (options: CreateInstanceOptions): Promise<Result<Instance, AppError>> => {
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

  // Create Fly.io machine
  log.info(`Creating Fly machine for instance ${instanceId}...`);
  const flyMachineResult = await flyService.createMachine(options);

  if (flyMachineResult.isErr()) {
    // Mark instance as failed
    instance.status = 'failed' as InstanceStatus;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);

    log.error(`Failed to create instance ${instanceId}:`, flyMachineResult.error);
    return err(flyMachineResult.error);
  }

  const flyMachine = flyMachineResult.value;

  // Update instance with Fly machine details
  instance.flyMachineId = flyMachine.id;
  instance.privateIpAddress = flyMachine.private_ip;
  instance.status = 'running' as InstanceStatus;
  instance.updatedAt = new Date();

  instances.set(instanceId, instance);

  log.info(`Instance ${instanceId} created successfully`);
  return ok(instance);
};

// Get an instance by ID
export const getInstance = async (instanceId: string): Promise<Result<Instance, NotFoundError | AppError>> => {
  const instance = instances.get(instanceId);

  if (!instance) {
    return err(new NotFoundError('Instance', instanceId));
  }

  // Update instance status from Fly.io if needed
  if (instance.flyMachineId && instance.status !== 'destroyed') {
    const flyMachineResult = await flyService.getMachine(instance.flyMachineId);

    if (flyMachineResult.isOk()) {
      const flyMachine = flyMachineResult.value;

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
    } else {
      log.error(`Failed to update instance ${instanceId} status:`, flyMachineResult.error);
    }
  }

  return ok(instance);
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
export const stopInstance = async (instanceId: string): Promise<Result<Instance, NotFoundError | AppError>> => {
  const instanceResult = await getInstance(instanceId);

  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;

  if (instance.status !== 'running') {
    return err(new AppError(`Instance ${instanceId} is not running`));
  }

  const stopResult = await flyService.stopMachine(instance.flyMachineId);

  if (stopResult.isErr()) {
    log.error(`Failed to stop instance ${instanceId}:`, stopResult.error);
    return err(stopResult.error);
  }

  instance.status = 'stopped' as InstanceStatus;
  instance.updatedAt = new Date();
  instances.set(instanceId, instance);

  log.info(`Instance ${instanceId} stopped successfully`);
  return ok(instance);
};

// Start an instance
export const startInstance = async (instanceId: string): Promise<Result<Instance, NotFoundError | AppError>> => {
  const instanceResult = await getInstance(instanceId);

  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;

  if (instance.status !== 'stopped') {
    return err(new AppError(`Instance ${instanceId} is not stopped`));
  }

  const startResult = await flyService.startMachine(instance.flyMachineId);

  if (startResult.isErr()) {
    log.error(`Failed to start instance ${instanceId}:`, startResult.error);
    return err(startResult.error);
  }

  instance.status = 'running' as InstanceStatus;
  instance.updatedAt = new Date();
  instances.set(instanceId, instance);

  log.info(`Instance ${instanceId} started successfully`);
  return ok(instance);
};

// Destroy an instance
export const destroyInstance = async (instanceId: string): Promise<Result<void, NotFoundError | AppError>> => {
  const instanceResult = await getInstance(instanceId);

  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;

  if (instance.status === 'destroyed') {
    return ok(undefined);
  }

  instance.status = 'destroying' as InstanceStatus;
  instance.updatedAt = new Date();
  instances.set(instanceId, instance);

  // Destroy Fly machine
  const destroyResult = await flyService.destroyMachine(instance.flyMachineId);

  if (destroyResult.isErr()) {
    instance.status = 'failed' as InstanceStatus;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);
    return err(destroyResult.error);
  }

  instance.status = 'destroyed' as InstanceStatus;
  instance.updatedAt = new Date();
  instances.set(instanceId, instance);

  log.info(`Instance ${instanceId} destroyed successfully`);
  return ok(undefined);
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
export const healthCheckInstance = async (instanceId: string): Promise<Result<boolean, NotFoundError | AppError>> => {
  const instanceResult = await getInstance(instanceId);

  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;

  if (!instance.flyMachineId) {
    return ok(false);
  }

  const flyMachineResult = await flyService.getMachine(instance.flyMachineId);

  if (flyMachineResult.isErr()) {
    log.error(`Health check failed for instance ${instanceId}:`, flyMachineResult.error);
    return ok(false);
  }

  const flyMachine = flyMachineResult.value;
  return ok(flyMachine.state === 'started' || flyMachine.state === 'running');
};

// Restart an instance
export const restartInstance = async (instanceId: string): Promise<Result<Instance, NotFoundError | AppError>> => {
  const instanceResult = await getInstance(instanceId);

  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;

  log.info(`Restarting instance ${instanceId}...`);

  // Stop the instance if running
  if (instance.status === 'running') {
    const stopResult = await stopInstance(instanceId);
    if (stopResult.isErr()) {
      return err(stopResult.error);
    }
    // Wait a bit for stop to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Start the instance
  return startInstance(instanceId);
};
