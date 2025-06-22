import { err, ok, type Result } from 'neverthrow';
import pino from 'pino';
import { AppError, NotFoundError } from '@/lib/error-handler';
import * as flyService from '@/services/fly-service';
import type { CreateInstanceOptions, FlyRegion, Instance, InstanceStatus, MachineSize } from '@/types/index';

const log = pino();

// Create instance with GitHub integration
export const createInstanceWithGitHub = async (options: CreateInstanceOptions): Promise<Result<Instance, AppError>> => {
  // Secrets are now passed directly as environment variables in fly-service.ts
  // No need to set app-level secrets anymore
  return createInstance(options);
};

// Create a new instance
export const createInstance = async (options: CreateInstanceOptions): Promise<Result<Instance, AppError>> => {
  // Create Fly.io machine directly
  log.info('Creating Fly machine...');
  const flyMachineResult = await flyService.createMachine(options);

  if (flyMachineResult.isErr()) {
    log.error('Failed to create machine:', flyMachineResult.error);
    return err(flyMachineResult.error);
  }

  const flyMachine = flyMachineResult.value;

  // Map Fly machine to Instance
  const instance: Instance = {
    id: flyMachine.id, // Use Fly machine ID directly
    flyMachineId: flyMachine.id,
    name: flyMachine.name,
    region: flyMachine.region as FlyRegion, // Type assertion needed
    image: flyMachine.config.image,
    size: 'shared-cpu-1x' as MachineSize, // Default since Fly doesn't expose this directly
    memoryMb: flyMachine.config.guest.memory_mb,
    status: mapFlyStateToInstanceStatus(flyMachine.state),
    createdAt: new Date(flyMachine.created_at),
    updatedAt: new Date(),
    privateIpAddress: flyMachine.private_ip,
    metadata: options.metadata,
  };

  log.info(`Instance ${flyMachine.id} created successfully`);
  return ok(instance);
};

// Get an instance by ID
export const getInstance = async (machineId: string): Promise<Result<Instance, NotFoundError | AppError>> => {
  // Get machine from Fly.io directly
  const flyMachineResult = await flyService.getMachine(machineId);

  if (flyMachineResult.isErr()) {
    // If it's a 404, return NotFoundError
    if (flyMachineResult.error.message.includes('404') || flyMachineResult.error.message.includes('not found')) {
      return err(new NotFoundError('Instance', machineId));
    }
    return err(flyMachineResult.error);
  }

  const flyMachine = flyMachineResult.value;

  // Map Fly machine to Instance
  const instance: Instance = {
    id: flyMachine.id,
    flyMachineId: flyMachine.id,
    name: flyMachine.name,
    region: flyMachine.region as FlyRegion,
    image: flyMachine.config.image,
    size: 'shared-cpu-1x' as MachineSize,
    memoryMb: flyMachine.config.guest.memory_mb,
    status: mapFlyStateToInstanceStatus(flyMachine.state),
    createdAt: new Date(flyMachine.created_at),
    updatedAt: new Date(),
    privateIpAddress: flyMachine.private_ip,
    metadata: {}, // Metadata not stored in Fly.io
  };

  return ok(instance);
};

// List all instances
export const listInstances = async (): Promise<Result<Instance[], AppError>> => {
  // Get all machines from Fly.io
  const flyMachinesResult = await flyService.listMachines();

  if (flyMachinesResult.isErr()) {
    log.error('Failed to list machines:', flyMachinesResult.error);
    return err(flyMachinesResult.error);
  }

  const flyMachines = flyMachinesResult.value;

  // Map Fly machines to Instances
  const instances = flyMachines.map((flyMachine) => ({
    id: flyMachine.id,
    flyMachineId: flyMachine.id,
    name: flyMachine.name,
    region: flyMachine.region as FlyRegion,
    image: flyMachine.config.image,
    size: 'shared-cpu-1x' as MachineSize,
    memoryMb: flyMachine.config.guest.memory_mb,
    status: mapFlyStateToInstanceStatus(flyMachine.state),
    createdAt: new Date(flyMachine.created_at),
    updatedAt: new Date(),
    privateIpAddress: flyMachine.private_ip,
    metadata: {},
  }));

  return ok(instances);
};

// Stop an instance
export const stopInstance = async (machineId: string): Promise<Result<Instance, NotFoundError | AppError>> => {
  // Get current instance state
  const instanceResult = await getInstance(machineId);

  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;

  if (instance.status !== 'running') {
    return err(new AppError(`Instance ${machineId} is not running`));
  }

  const stopResult = await flyService.stopMachine(machineId);

  if (stopResult.isErr()) {
    log.error(`Failed to stop instance ${machineId}:`, stopResult.error);
    return err(stopResult.error);
  }

  // Return updated instance
  instance.status = 'stopped' as InstanceStatus;
  instance.updatedAt = new Date();

  log.info(`Instance ${machineId} stopped successfully`);
  return ok(instance);
};

// Start an instance
export const startInstance = async (machineId: string): Promise<Result<Instance, NotFoundError | AppError>> => {
  // Get current instance state
  const instanceResult = await getInstance(machineId);

  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;

  if (instance.status !== 'stopped') {
    return err(new AppError(`Instance ${machineId} is not stopped`));
  }

  const startResult = await flyService.startMachine(machineId);

  if (startResult.isErr()) {
    log.error(`Failed to start instance ${machineId}:`, startResult.error);
    return err(startResult.error);
  }

  // Return updated instance
  instance.status = 'running' as InstanceStatus;
  instance.updatedAt = new Date();

  log.info(`Instance ${machineId} started successfully`);
  return ok(instance);
};

// Destroy an instance
export const destroyInstance = async (machineId: string): Promise<Result<void, NotFoundError | AppError>> => {
  // Check if instance exists first
  const instanceResult = await getInstance(machineId);

  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;

  if (instance.status === 'destroyed') {
    return ok(undefined);
  }

  // Destroy Fly machine
  const destroyResult = await flyService.destroyMachine(machineId);

  if (destroyResult.isErr()) {
    return err(destroyResult.error);
  }

  log.info(`Instance ${machineId} destroyed successfully`);
  return ok(undefined);
};

// Get instance statistics
export const getInstanceStats = async (): Promise<
  Result<
    {
      total: number;
      running: number;
      stopped: number;
      failed: number;
    },
    AppError
  >
> => {
  const instancesResult = await listInstances();

  if (instancesResult.isErr()) {
    return err(instancesResult.error);
  }

  const instances = instancesResult.value;

  const stats = {
    total: instances.length,
    running: instances.filter((i) => i.status === 'running').length,
    stopped: instances.filter((i) => i.status === 'stopped').length,
    failed: instances.filter((i) => i.status === 'failed').length,
  };

  return ok(stats);
};

// Health check an instance
export const healthCheckInstance = async (machineId: string): Promise<Result<boolean, NotFoundError | AppError>> => {
  const flyMachineResult = await flyService.getMachine(machineId);

  if (flyMachineResult.isErr()) {
    // If it's a 404, return NotFoundError
    if (flyMachineResult.error.message.includes('404') || flyMachineResult.error.message.includes('not found')) {
      return err(new NotFoundError('Instance', machineId));
    }
    log.error(`Health check failed for instance ${machineId}:`, flyMachineResult.error);
    return ok(false);
  }

  const flyMachine = flyMachineResult.value;
  return ok(flyMachine.state === 'started' || flyMachine.state === 'running');
};

// Restart an instance
export const restartInstance = async (machineId: string): Promise<Result<Instance, NotFoundError | AppError>> => {
  // Get current instance state
  const instanceResult = await getInstance(machineId);

  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;

  log.info(`Restarting instance ${machineId}...`);

  // Stop the instance if running
  if (instance.status === 'running') {
    const stopResult = await stopInstance(machineId);
    if (stopResult.isErr()) {
      return err(stopResult.error);
    }
    // Wait a bit for stop to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Start the instance
  return startInstance(machineId);
};

// Stop all instances
export const stopAllInstances = async (): Promise<Result<Instance[], AppError>> => {
  const instancesResult = await listInstances();

  if (instancesResult.isErr()) {
    return err(instancesResult.error);
  }

  const instances = instancesResult.value;
  const runningInstances = instances.filter((i) => i.status === 'running');

  if (runningInstances.length === 0) {
    return ok([]);
  }

  log.info(`Stopping ${runningInstances.length} running instances...`);

  const stopResults = await Promise.allSettled(runningInstances.map((instance) => stopInstance(instance.id)));

  const stoppedInstances: Instance[] = [];

  for (const [index, result] of stopResults.entries()) {
    if (result.status === 'fulfilled' && result.value.isOk()) {
      stoppedInstances.push(result.value.value);
    } else {
      const errorDetails =
        result.status === 'fulfilled' ? (result.value.isErr() ? result.value.error : 'Unknown error') : result.reason;
      log.error(`Failed to stop instance ${runningInstances[index].id}:`, errorDetails);
    }
  }

  log.info(`Successfully stopped ${stoppedInstances.length} of ${runningInstances.length} instances`);
  return ok(stoppedInstances);
};

// Destroy all instances
export const destroyAllInstances = async (): Promise<Result<void, AppError>> => {
  const instancesResult = await listInstances();

  if (instancesResult.isErr()) {
    return err(instancesResult.error);
  }

  const instances = instancesResult.value;

  if (instances.length === 0) {
    return ok(undefined);
  }

  log.info(`Destroying ${instances.length} instances...`);

  const destroyResults = await Promise.allSettled(instances.map((instance) => destroyInstance(instance.id)));

  let successCount = 0;

  for (const [index, result] of destroyResults.entries()) {
    if (result.status === 'fulfilled' && result.value.isOk()) {
      successCount++;
    } else {
      const errorDetails =
        result.status === 'fulfilled' ? (result.value.isErr() ? result.value.error : 'Unknown error') : result.reason;
      log.error(`Failed to destroy instance ${instances[index].id}:`, errorDetails);
    }
  }

  log.info(`Successfully destroyed ${successCount} of ${instances.length} instances`);
  return ok(undefined);
};

// Helper function to map Fly machine state to InstanceStatus
function mapFlyStateToInstanceStatus(flyState: string): InstanceStatus {
  switch (flyState) {
    case 'created':
    case 'starting':
      return 'starting' as InstanceStatus;
    case 'started':
    case 'running':
      return 'running' as InstanceStatus;
    case 'stopping':
      return 'stopping' as InstanceStatus;
    case 'stopped':
      return 'stopped' as InstanceStatus;
    case 'destroying':
      return 'destroying' as InstanceStatus;
    case 'destroyed':
      return 'destroyed' as InstanceStatus;
    default:
      return 'failed' as InstanceStatus;
  }
}
