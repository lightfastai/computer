import type { Result } from 'neverthrow';
import { err } from 'neverthrow';
import type { AppError, NotFoundError } from '@/lib/error-handler';
import { ValidationError } from '@/lib/error-handler';
import { setStorage, InMemoryStorage, FileStorage, type InstanceStorage } from '@/lib/storage';
import { createInstanceSchema, instanceIdSchema, executeCommandSchema } from '@/schemas';
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
  create: async (options: CreateInstanceOptions) => {
    try {
      const validated = createInstanceSchema.parse(options);
      if (validated.secrets?.githubToken) {
        return instanceService.createInstanceWithGitHub(validated);
      }
      return instanceService.createInstance(validated);
    } catch (error) {
      if (error instanceof Error) {
        return err(new ValidationError(error.message));
      }
      return err(new ValidationError('Invalid instance configuration'));
    }
  },

  get: async (id: string) => {
    try {
      const validatedId = instanceIdSchema.parse(id);
      return instanceService.getInstance(validatedId);
    } catch (error) {
      if (error instanceof Error) {
        return err(new ValidationError(error.message));
      }
      return err(new ValidationError('Invalid instance ID'));
    }
  },

  list: () => instanceService.listInstances(),

  start: async (id: string) => {
    try {
      const validatedId = instanceIdSchema.parse(id);
      return instanceService.startInstance(validatedId);
    } catch (error) {
      if (error instanceof Error) {
        return err(new ValidationError(error.message));
      }
      return err(new ValidationError('Invalid instance ID'));
    }
  },

  stop: async (id: string) => {
    try {
      const validatedId = instanceIdSchema.parse(id);
      return instanceService.stopInstance(validatedId);
    } catch (error) {
      if (error instanceof Error) {
        return err(new ValidationError(error.message));
      }
      return err(new ValidationError('Invalid instance ID'));
    }
  },

  restart: async (id: string) => {
    try {
      const validatedId = instanceIdSchema.parse(id);
      return instanceService.restartInstance(validatedId);
    } catch (error) {
      if (error instanceof Error) {
        return err(new ValidationError(error.message));
      }
      return err(new ValidationError('Invalid instance ID'));
    }
  },

  destroy: async (id: string) => {
    try {
      const validatedId = instanceIdSchema.parse(id);
      return instanceService.destroyInstance(validatedId);
    } catch (error) {
      if (error instanceof Error) {
        return err(new ValidationError(error.message));
      }
      return err(new ValidationError('Invalid instance ID'));
    }
  },

  healthCheck: async (id: string) => {
    try {
      const validatedId = instanceIdSchema.parse(id);
      return instanceService.healthCheckInstance(validatedId);
    } catch (error) {
      if (error instanceof Error) {
        return err(new ValidationError(error.message));
      }
      return err(new ValidationError('Invalid instance ID'));
    }
  },

  getStats: () => instanceService.getInstanceStats(),
});

const createCommandManager = (): CommandManager => ({
  execute: async (options: ExecuteCommandOptions) => {
    try {
      // Validate command options first
      const validated = executeCommandSchema.parse(options);

      // Validate instance ID separately
      const validatedInstanceId = instanceIdSchema.parse(options.instanceId);

      // Check instance exists and get machine ID
      const instanceResult = await instanceService.getInstance(validatedInstanceId);
      if (instanceResult.isErr()) {
        return err(instanceResult.error);
      }

      const instance = instanceResult.value;
      if (instance.status !== 'running') {
        return err(new ValidationError(`Instance ${validatedInstanceId} is not running`));
      }

      if (!instance.flyMachineId) {
        return err(new ValidationError(`Instance ${validatedInstanceId} has no machine ID`));
      }

      return commandService.executeCommand({
        instanceId: validatedInstanceId,
        machineId: instance.flyMachineId,
        command: validated.command,
        args: validated.args,
        timeout: validated.timeout,
        onData: options.onData,
        onError: options.onError,
      });
    } catch (error) {
      if (error instanceof Error) {
        return err(new ValidationError(error.message));
      }
      return err(new ValidationError('Invalid command configuration'));
    }
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
        case 'file': {
          const fileStorage = new FileStorage(options.dataDir);
          // Note: In a real implementation, you'd want to handle the async loadFromDisk
          // For now, we'll load in the background
          fileStorage.loadFromDisk().catch(console.error);
          setStorage(fileStorage);
          break;
        }
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
