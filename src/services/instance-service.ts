import { NotFoundError } from '@/lib/error-handler';
import * as flyService from '@/services/fly-service';
import * as sshService from '@/services/ssh-service';
import {
  type CommandExecution,
  CommandStatus,
  type CreateInstanceOptions,
  type Instance,
  InstanceStatus,
} from '@/types/index';
import { nanoid } from 'nanoid';
import pino from 'pino';

const log = pino();

// State stores
const instances = new Map<string, Instance>();
const commandExecutions = new Map<string, CommandExecution>();

// Clear all instances (for testing)
export const clearAllInstances = (): void => {
  instances.clear();
  commandExecutions.clear();
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
    status: InstanceStatus.CREATING,
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
    instance.status = InstanceStatus.RUNNING;
    instance.updatedAt = new Date();

    instances.set(instanceId, instance);

    log.info(`Instance ${instanceId} created successfully`);
    return instance;
  } catch (error) {
    // Mark instance as failed
    instance.status = InstanceStatus.FAILED;
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
  if (instance.flyMachineId && instance.status !== InstanceStatus.DESTROYED) {
    try {
      const flyMachine = await flyService.getMachine(instance.flyMachineId);

      // Update status based on Fly machine state
      switch (flyMachine.state) {
        case 'started':
        case 'running':
          instance.status = InstanceStatus.RUNNING;
          break;
        case 'stopped':
          instance.status = InstanceStatus.STOPPED;
          break;
        case 'destroyed':
          instance.status = InstanceStatus.DESTROYED;
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
    if (instance.status === InstanceStatus.DESTROYED) {
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

  if (instance.status !== InstanceStatus.RUNNING) {
    throw new Error(`Instance ${instanceId} is not running`);
  }

  try {
    await flyService.stopMachine(instance.flyMachineId);

    instance.status = InstanceStatus.STOPPED;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);

    // Disconnect SSH
    sshService.disconnect(instanceId);

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

  if (instance.status !== InstanceStatus.STOPPED) {
    throw new Error(`Instance ${instanceId} is not stopped`);
  }

  try {
    await flyService.startMachine(instance.flyMachineId);

    instance.status = InstanceStatus.RUNNING;
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

  if (instance.status === InstanceStatus.DESTROYED) {
    return;
  }

  try {
    instance.status = InstanceStatus.DESTROYING;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);

    // Disconnect SSH
    sshService.disconnect(instanceId);

    // Destroy Fly machine
    await flyService.destroyMachine(instance.flyMachineId);

    instance.status = InstanceStatus.DESTROYED;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);

    log.info(`Instance ${instanceId} destroyed successfully`);
  } catch (error) {
    instance.status = InstanceStatus.FAILED;
    instance.updatedAt = new Date();
    instances.set(instanceId, instance);
    throw error;
  }
};

// Execute a command on an instance
export const executeCommand = async (
  instanceId: string,
  command: string,
  options?: { timeout?: number }
): Promise<CommandExecution> => {
  const instance = await getInstance(instanceId);

  if (instance.status !== InstanceStatus.RUNNING) {
    throw new Error(`Instance ${instanceId} is not running`);
  }

  const executionId = nanoid();
  const execution: CommandExecution = {
    id: executionId,
    instanceId,
    command,
    status: CommandStatus.PENDING,
    startedAt: new Date(),
  };

  commandExecutions.set(executionId, execution);

  try {
    // Ensure SSH connection
    await ensureSSHConnection(instance);

    execution.status = CommandStatus.RUNNING;
    commandExecutions.set(executionId, execution);

    // Execute command
    const result = await sshService.executeCommand(instanceId, command, options);

    execution.status = CommandStatus.COMPLETED;
    execution.output = result.stdout;
    execution.error = result.stderr;
    execution.exitCode = result.exitCode;
    execution.completedAt = new Date();

    commandExecutions.set(executionId, execution);

    log.info(`Command execution ${executionId} completed successfully`);
    return execution;
  } catch (error) {
    execution.status = CommandStatus.FAILED;
    execution.error = error.message;
    execution.completedAt = new Date();
    commandExecutions.set(executionId, execution);

    log.error(`Command execution ${executionId} failed:`, error);
    throw error;
  }
};

// Get command execution details
export const getCommandExecution = async (executionId: string): Promise<CommandExecution> => {
  const execution = commandExecutions.get(executionId);

  if (!execution) {
    throw new NotFoundError('CommandExecution', executionId);
  }

  return execution;
};

// Ensure SSH connection to instance
const ensureSSHConnection = async (instance: Instance): Promise<void> => {
  if (sshService.isConnected(instance.id)) {
    return;
  }

  log.info(`Establishing SSH connection to instance ${instance.id}...`);

  try {
    await sshService.connect(instance.id, {
      host: instance.ipAddress || instance.privateIpAddress!,
      username: 'root',
    });
  } catch (error) {
    log.error(`Failed to establish SSH connection to instance ${instance.id}:`, error);
    throw new Error(`SSH connection failed: ${error.message}`);
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
    running: instanceArray.filter((i) => i.status === InstanceStatus.RUNNING).length,
    stopped: instanceArray.filter((i) => i.status === InstanceStatus.STOPPED).length,
    failed: instanceArray.filter((i) => i.status === InstanceStatus.FAILED).length,
  };
};