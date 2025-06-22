import type { Result } from 'neverthrow';
import { err } from 'neverthrow';
import type { AppError, NotFoundError } from '@/lib/error-handler';
import { ValidationError } from '@/lib/error-handler';
import { setStorage, InMemoryStorage, FileStorage, type InstanceStorage } from '@/lib/storage';
import * as commandService from '@/services/command-service';
import * as instanceService from '@/services/instance-service';
import type { CreateInstanceOptions, Instance } from '@/types/index';

export interface LightfastComputerSDK {
  instances: InstanceManager;
  commands: CommandManager;
}

export interface InstanceManager {
  create(options: CreateInstanceOptions): Promise<Result<Instance, AppError>>;
  get(id: string): Promise<Result<Instance, NotFoundError | AppError>>;
  list(): Promise<Instance[]>;
  start(id: string): Promise<Result<Instance, NotFoundError | AppError>>;
  stop(id: string): Promise<Result<Instance, NotFoundError | AppError>>;
  restart(id: string): Promise<Result<Instance, NotFoundError | AppError>>;
  destroy(id: string): Promise<Result<void, NotFoundError | AppError>>;
  healthCheck(id: string): Promise<Result<boolean, NotFoundError | AppError>>;
  getStats(): Promise<{ total: number; running: number; stopped: number; failed: number }>;
}

export interface CommandManager {
  execute(options: ExecuteCommandOptions): Promise<Result<ExecuteCommandResult, AppError>>;
  getHistory(instanceId: string): Promise<CommandExecution[]>;
  clearHistory(instanceId: string): void;
}

export interface ExecuteCommandOptions {
  instanceId: string;
  command: string;
  args?: string[];
  timeout?: number;
  onData?: (data: string) => void;
  onError?: (error: string) => void;
}

export interface ExecuteCommandResult {
  output: string;
  error: string;
  exitCode: number | null;
}

export interface CommandExecution {
  id: string;
  instanceId: string;
  command: string;
  args: string[];
  output: string;
  error: string;
  exitCode: number | null;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'timeout';
}

const createInstanceManager = (): InstanceManager => ({
  create: (options: CreateInstanceOptions) => {
    if (options.secrets?.githubToken) {
      return instanceService.createInstanceWithGitHub(options);
    }
    return instanceService.createInstance(options);
  },

  get: (id: string) => {
    if (!id) {
      return Promise.resolve(err(new ValidationError('Instance ID is required')));
    }
    return instanceService.getInstance(id);
  },

  list: () => instanceService.listInstances(),

  start: (id: string) => {
    if (!id) {
      return Promise.resolve(err(new ValidationError('Instance ID is required')));
    }
    return instanceService.startInstance(id);
  },

  stop: (id: string) => {
    if (!id) {
      return Promise.resolve(err(new ValidationError('Instance ID is required')));
    }
    return instanceService.stopInstance(id);
  },

  restart: (id: string) => {
    if (!id) {
      return Promise.resolve(err(new ValidationError('Instance ID is required')));
    }
    return instanceService.restartInstance(id);
  },

  destroy: (id: string) => {
    if (!id) {
      return Promise.resolve(err(new ValidationError('Instance ID is required')));
    }
    return instanceService.destroyInstance(id);
  },

  healthCheck: (id: string) => {
    if (!id) {
      return Promise.resolve(err(new ValidationError('Instance ID is required')));
    }
    return instanceService.healthCheckInstance(id);
  },

  getStats: () => instanceService.getInstanceStats(),
});

const createCommandManager = (): CommandManager => ({
  execute: async (options: ExecuteCommandOptions) => {
    const { instanceId, command, args = [], timeout, onData, onError } = options;

    if (!instanceId) {
      return err(new ValidationError('Instance ID is required'));
    }

    if (!command) {
      return err(new ValidationError('Command is required'));
    }

    // Validate instance exists and get machine ID
    const instanceResult = await instanceService.getInstance(instanceId);
    if (instanceResult.isErr()) {
      return err(instanceResult.error);
    }

    const instance = instanceResult.value;
    if (instance.status !== 'running') {
      return err(new ValidationError(`Instance ${instanceId} is not running`));
    }

    if (!instance.flyMachineId) {
      return err(new ValidationError(`Instance ${instanceId} has no machine ID`));
    }

    // Security check - basic command validation
    const allowedCommands = ['ls', 'grep', 'find', 'cat', 'echo', 'pwd', 'env', 'ps', 'df', 'du', 'git'];
    const baseCommand = command.split(' ')[0];
    if (!allowedCommands.includes(baseCommand)) {
      return err(new ValidationError(`Command '${baseCommand}' is not allowed`));
    }

    return commandService.executeCommand({
      instanceId,
      machineId: instance.flyMachineId,
      command,
      args,
      timeout,
      onData,
      onError,
    });
  },

  getHistory: (instanceId: string) => {
    return commandService.getCommandHistory(instanceId);
  },

  clearHistory: (instanceId: string) => {
    commandService.clearCommandHistory(instanceId);
  },
});

export interface LightfastComputerOptions {
  storage?: InstanceStorage | 'memory' | 'file';
  dataDir?: string;
}

export const createLightfastComputer = (options: LightfastComputerOptions = {}): LightfastComputerSDK => {
  // Configure storage
  if (options.storage) {
    if (typeof options.storage === 'string') {
      switch (options.storage) {
        case 'memory':
          setStorage(new InMemoryStorage());
          break;
        case 'file':
          const fileStorage = new FileStorage(options.dataDir);
          // Note: In a real implementation, you'd want to handle the async loadFromDisk
          // For now, we'll load in the background
          fileStorage.loadFromDisk().catch(console.error);
          setStorage(fileStorage);
          break;
      }
    } else {
      setStorage(options.storage);
    }
  }

  return {
    instances: createInstanceManager(),
    commands: createCommandManager(),
  };
};

// Default export for convenience
export default createLightfastComputer;

// Named exports for types
export type {
  CreateInstanceOptions,
  Instance,
} from '@/types/index';

export {
  AppError,
  NotFoundError,
  ValidationError,
  InstanceCreationError,
  InstanceOperationError,
  InstanceStateError,
  InfrastructureError,
} from '@/lib/error-handler';