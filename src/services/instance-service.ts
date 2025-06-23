import { err, ok, type Result } from 'neverthrow';
import type { Logger } from 'pino';
import { AppError, NotFoundError } from '@/lib/error-handler';
import * as flyService from '@/services/fly-service';
import type { CreateInstanceOptions, FlyRegion, Instance, InstanceStatus, MachineSize } from '@/types/index';

// Create instance with GitHub integration
export const createInstanceWithGitHub = async (
  options: CreateInstanceOptions,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<Instance, AppError>> => {
  // Secrets are now passed directly as environment variables in fly-service.ts
  // No need to set app-level secrets anymore
  return createInstance(options, flyApiToken, appName, logger);
};

// Create a new instance
export const createInstance = async (
  options: CreateInstanceOptions,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<Instance, AppError>> => {
  // Create Fly.io machine directly
  logger.info('Creating Fly machine...');
  const flyMachineResult = await flyService.createMachine(options, flyApiToken, appName, logger);

  if (flyMachineResult.isErr()) {
    logger.error('Failed to create machine:', flyMachineResult.error);
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

  logger.info(`Instance created successfully: ${instance.id}`);
  return ok(instance);
};

// Get an instance by ID
export const getInstance = async (
  id: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<Instance, NotFoundError | AppError>> => {
  // Get machine from Fly API
  const machineResult = await flyService.getMachine(id, flyApiToken, appName, logger);

  if (machineResult.isErr()) {
    if (machineResult.error.message?.includes('not found')) {
      return err(new NotFoundError('Instance', id));
    }
    return err(machineResult.error);
  }

  const flyMachine = machineResult.value;
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
    metadata: flyMachine.config.env as Record<string, string>,
  };

  return ok(instance);
};

// List all instances
export const listInstances = async (
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<Instance[], AppError>> => {
  const machinesResult = await flyService.listMachines(flyApiToken, appName, logger);

  if (machinesResult.isErr()) {
    return err(machinesResult.error);
  }

  const instances = machinesResult.value.map((flyMachine) => ({
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
    metadata: flyMachine.config.env as Record<string, string>,
  }));

  return ok(instances);
};

// Stop an instance
export const stopInstance = async (
  id: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<Instance, NotFoundError | AppError>> => {
  // First check if instance exists
  const instanceResult = await getInstance(id, flyApiToken, appName, logger);
  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;
  if (instance.status !== 'running') {
    return err(new AppError(`Instance ${id} is not running (current status: ${instance.status})`, 400));
  }

  const stopResult = await flyService.stopMachine(id, flyApiToken, appName, logger);
  if (stopResult.isErr()) {
    return err(stopResult.error);
  }

  instance.status = 'stopped';
  instance.updatedAt = new Date();
  logger.info(`Instance stopped: ${id}`);
  return ok(instance);
};

// Start an instance
export const startInstance = async (
  id: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<Instance, NotFoundError | AppError>> => {
  // First check if instance exists
  const instanceResult = await getInstance(id, flyApiToken, appName, logger);
  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const instance = instanceResult.value;
  if (instance.status === 'running') {
    return ok(instance); // Already running
  }

  const startResult = await flyService.startMachine(id, flyApiToken, appName, logger);
  if (startResult.isErr()) {
    return err(startResult.error);
  }

  instance.status = 'running';
  instance.updatedAt = new Date();
  logger.info(`Instance started: ${id}`);
  return ok(instance);
};

// Restart an instance
export const restartInstance = async (
  id: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<Instance, NotFoundError | AppError>> => {
  logger.info(`Restarting instance: ${id}`);

  // Stop the instance
  const stopResult = await flyService.stopMachine(id, flyApiToken, appName, logger);
  if (stopResult.isErr()) {
    if (stopResult.error.message?.includes('not found')) {
      return err(new NotFoundError('Instance', id));
    }
    // Continue even if stop fails (instance might already be stopped)
  }

  // Wait a bit before starting
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Start the instance
  const startResult = await flyService.startMachine(id, flyApiToken, appName, logger);
  if (startResult.isErr()) {
    return err(startResult.error);
  }

  // Get updated instance
  return getInstance(id, flyApiToken, appName, logger);
};

// Destroy an instance
export const destroyInstance = async (
  id: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<void, NotFoundError | AppError>> => {
  // Destroy the Fly machine
  const destroyResult = await flyService.destroyMachine(id, flyApiToken, appName, logger);
  if (destroyResult.isErr()) {
    if (destroyResult.error.message?.includes('not found')) {
      // Already destroyed, return success
      return ok(undefined);
    }
    return err(destroyResult.error);
  }

  logger.info(`Instance destroyed: ${id}`);
  return ok(undefined);
};

// Health check instance
export const healthCheckInstance = async (
  id: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<boolean, NotFoundError | AppError>> => {
  const instanceResult = await getInstance(id, flyApiToken, appName, logger);
  if (instanceResult.isErr()) {
    return err(instanceResult.error);
  }

  const isHealthy = instanceResult.value.status === 'running';
  return ok(isHealthy);
};

// Get instance statistics
export const getInstanceStats = async (
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<InstanceStats, AppError>> => {
  const instancesResult = await listInstances(flyApiToken, appName, logger);
  if (instancesResult.isErr()) {
    return err(instancesResult.error);
  }

  const instances = instancesResult.value;
  const stats: InstanceStats = {
    total: instances.length,
    running: instances.filter((i) => i.status === 'running').length,
    stopped: instances.filter((i) => i.status === 'stopped').length,
    failed: instances.filter((i) => i.status === 'failed').length,
  };

  return ok(stats);
};

// Stop all instances
export const stopAllInstances = async (
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<Instance[], AppError>> => {
  const instancesResult = await listInstances(flyApiToken, appName, logger);
  if (instancesResult.isErr()) {
    return err(instancesResult.error);
  }

  const instances = instancesResult.value;
  const runningInstances = instances.filter((i) => i.status === 'running');

  if (runningInstances.length === 0) {
    return ok([]);
  }

  const stoppedInstances: Instance[] = [];
  for (const instance of runningInstances) {
    const stopResult = await stopInstance(instance.id, flyApiToken, appName, logger);
    if (stopResult.isOk()) {
      stoppedInstances.push(stopResult.value);
    }
  }

  return ok(stoppedInstances);
};

// Destroy all instances
export const destroyAllInstances = async (
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<void, AppError>> => {
  const instancesResult = await listInstances(flyApiToken, appName, logger);
  if (instancesResult.isErr()) {
    return err(instancesResult.error);
  }

  const instances = instancesResult.value;
  if (instances.length === 0) {
    return ok(undefined);
  }

  // Destroy all instances
  for (const instance of instances) {
    await destroyInstance(instance.id, flyApiToken, appName, logger);
  }

  return ok(undefined);
};

// Map Fly.io machine state to InstanceStatus
const mapFlyStateToInstanceStatus = (state: string): InstanceStatus => {
  switch (state) {
    case 'started':
    case 'running':
      return 'running';
    case 'stopped':
    case 'stopping':
      return 'stopped';
    case 'failed':
    case 'error':
      return 'failed';
    case 'creating':
    case 'starting':
      return 'provisioning';
    default:
      return 'unknown';
  }
};

// InstanceStats interface
interface InstanceStats {
  total: number;
  running: number;
  stopped: number;
  failed: number;
}
