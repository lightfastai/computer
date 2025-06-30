import { err, ok, type Result } from 'neverthrow';
import { AppError, NotFoundError } from '@/lib/error-handler';
import type { CreateInstanceOptions, FlyRegion, Instance, InstanceStatus, MachineSize } from '@/types/index';
import type { ComputeProvider, Machine, CreateMachineOptions } from '@/types/provider';

// Map provider Machine to SDK Instance
const mapMachineToInstance = (machine: Machine, metadata?: Record<string, string>): Instance => {
  return {
    id: machine.id,
    flyMachineId: machine.id, // Keep for backward compatibility
    name: machine.name,
    region: machine.region as FlyRegion,
    image: machine.image || 'docker.io/library/ubuntu:22.04',
    size: (machine.size || 'shared-cpu-1x') as MachineSize,
    memoryMb: 512, // Default, providers may not expose this
    status: mapMachineStateToInstanceStatus(machine.state),
    createdAt: new Date(machine.created_at),
    updatedAt: new Date(machine.updated_at),
    privateIpAddress: machine.private_ip,
    metadata,
  };
};

// Map provider machine state to SDK instance status
const mapMachineStateToInstanceStatus = (state: string): InstanceStatus => {
  switch (state) {
    case 'started':
    case 'running':
      return 'running';
    case 'stopped':
      return 'stopped';
    case 'starting':
      return 'starting';
    case 'stopping':
      return 'stopping';
    case 'creating':
      return 'creating';
    case 'destroying':
      return 'destroying';
    case 'destroyed':
      return 'destroyed';
    case 'failed':
      return 'failed';
    default:
      return 'unknown';
  }
};

// Map SDK CreateInstanceOptions to provider CreateMachineOptions
const mapCreateOptionsToMachineOptions = (options: CreateInstanceOptions): CreateMachineOptions => {
  return {
    name: options.name,
    region: options.region || 'iad',
    image: options.image || 'docker.io/library/ubuntu:22.04',
    size: options.size || 'shared-cpu-1x',
    githubToken: options.secrets?.githubToken,
    githubUsername: options.secrets?.githubUsername,
    repoUrl: options.repoUrl,
    metadata: options.metadata,
  };
};

// Create a new instance
export const createInstance = async (
  options: CreateInstanceOptions,
  provider: ComputeProvider,
): Promise<Result<Instance, AppError>> => {
  const machineOptions = mapCreateOptionsToMachineOptions(options);
  const machineResult = await provider.createMachine(machineOptions);

  if (machineResult.isErr()) {
    return err(machineResult.error);
  }

  const machine = machineResult.value;
  const instance = mapMachineToInstance(machine, options.metadata);

  return ok(instance);
};

// Get an instance by ID
export const getInstance = async (
  id: string,
  provider: ComputeProvider,
): Promise<Result<Instance, NotFoundError | AppError>> => {
  const machineResult = await provider.getMachine(id);

  if (machineResult.isErr()) {
    if (machineResult.error.message?.includes('not found')) {
      return err(new NotFoundError('Instance', id));
    }
    return err(machineResult.error);
  }

  const machine = machineResult.value;
  const instance = mapMachineToInstance(machine);

  return ok(instance);
};

// List all instances
export const listInstances = async (provider: ComputeProvider): Promise<Result<Instance[], AppError>> => {
  const machinesResult = await provider.listMachines();

  if (machinesResult.isErr()) {
    return err(machinesResult.error);
  }

  const machines = machinesResult.value;
  const instances = machines.map((machine) => mapMachineToInstance(machine));

  return ok(instances);
};

// Start an instance
export const startInstance = async (
  id: string,
  provider: ComputeProvider,
): Promise<Result<Instance, NotFoundError | AppError>> => {
  const machineResult = await provider.startMachine(id);

  if (machineResult.isErr()) {
    if (machineResult.error.message?.includes('not found')) {
      return err(new NotFoundError('Instance', id));
    }
    return err(machineResult.error);
  }

  const machine = machineResult.value;
  const instance = mapMachineToInstance(machine);

  return ok(instance);
};

// Stop an instance
export const stopInstance = async (
  id: string,
  provider: ComputeProvider,
): Promise<Result<Instance, NotFoundError | AppError>> => {
  const machineResult = await provider.stopMachine(id);

  if (machineResult.isErr()) {
    if (machineResult.error.message?.includes('not found')) {
      return err(new NotFoundError('Instance', id));
    }
    return err(machineResult.error);
  }

  const machine = machineResult.value;
  const instance = mapMachineToInstance(machine);

  return ok(instance);
};

// Restart an instance (stop then start)
export const restartInstance = async (
  id: string,
  provider: ComputeProvider,
): Promise<Result<Instance, NotFoundError | AppError>> => {
  // Stop first
  const stopResult = await provider.stopMachine(id);
  if (stopResult.isErr()) {
    if (stopResult.error.message?.includes('not found')) {
      return err(new NotFoundError('Instance', id));
    }
    return err(stopResult.error);
  }

  // Wait a moment for the machine to stop
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Then start
  const startResult = await provider.startMachine(id);
  if (startResult.isErr()) {
    return err(startResult.error);
  }

  const machine = startResult.value;
  const instance = mapMachineToInstance(machine);

  return ok(instance);
};

// Destroy an instance
export const destroyInstance = async (
  id: string,
  provider: ComputeProvider,
): Promise<Result<void, NotFoundError | AppError>> => {
  const result = await provider.destroyMachine(id);

  if (result.isErr()) {
    if (result.error.message?.includes('not found')) {
      return err(new NotFoundError('Instance', id));
    }
    return err(result.error);
  }

  return ok(undefined);
};

// Health check an instance
export const healthCheckInstance = async (
  id: string,
  provider: ComputeProvider,
): Promise<Result<boolean, NotFoundError | AppError>> => {
  const machineResult = await provider.getMachine(id);

  if (machineResult.isErr()) {
    if (machineResult.error.message?.includes('not found')) {
      return err(new NotFoundError('Instance', id));
    }
    return err(machineResult.error);
  }

  const machine = machineResult.value;
  const isHealthy = machine.state === 'started' || machine.state === 'running';

  return ok(isHealthy);
};

// Get instance statistics
export const getInstanceStats = async (provider: ComputeProvider): Promise<Result<InstanceStats, AppError>> => {
  const machinesResult = await provider.listMachines();

  if (machinesResult.isErr()) {
    return err(machinesResult.error);
  }

  const machines = machinesResult.value;
  const stats = {
    total: machines.length,
    running: machines.filter((m) => m.state === 'started' || m.state === 'running').length,
    stopped: machines.filter((m) => m.state === 'stopped').length,
    failed: machines.filter((m) => m.state === 'failed').length,
  };

  return ok(stats);
};

// Stop all instances
export const stopAllInstances = async (provider: ComputeProvider): Promise<Result<Instance[], AppError>> => {
  const machinesResult = await provider.listMachines();

  if (machinesResult.isErr()) {
    return err(machinesResult.error);
  }

  const machines = machinesResult.value;
  const runningMachines = machines.filter((m) => m.state === 'started' || m.state === 'running');

  const stopResults = await Promise.all(runningMachines.map((machine) => provider.stopMachine(machine.id)));

  const stoppedInstances: Instance[] = [];

  for (const result of stopResults) {
    if (result.isOk()) {
      stoppedInstances.push(mapMachineToInstance(result.value));
    }
  }

  return ok(stoppedInstances);
};

// Destroy all instances
export const destroyAllInstances = async (provider: ComputeProvider): Promise<Result<void, AppError>> => {
  const machinesResult = await provider.listMachines();

  if (machinesResult.isErr()) {
    return err(machinesResult.error);
  }

  const machines = machinesResult.value;

  await Promise.all(machines.map((machine) => provider.destroyMachine(machine.id)));

  return ok(undefined);
};

export interface InstanceStats {
  total: number;
  running: number;
  stopped: number;
  failed: number;
}
