import type { Result } from 'neverthrow';
import { err, ok } from 'neverthrow';
import type { AppError, NotFoundError } from '@/lib/error-handler';
import { ValidationError } from '@/lib/error-handler';
import { createProvider } from '@/providers/provider-factory';
import { createInstanceSchema, executeCommandSchema, instanceIdSchema } from '@/schemas';
import type { LightfastComputerConfig } from '@/schemas/sdk-config';
import type { ExecuteCommandResult } from '@/services/command-service';
import * as commandService from '@/services/command-service';
import * as instanceService from '@/services/instance-service';
import type { CreateInstanceOptions, Instance } from '@/types/index';
import type { ComputeProvider } from '@/types/provider';

// Re-export the config types for convenience
export type { FlyProviderConfig, LightfastComputerConfig, VercelProviderConfig } from '@/schemas/sdk-config';

export interface LightfastComputerSDK {
  instances: InstanceManager;
  commands: CommandManager;
}

export interface InstanceManager {
  create(options: CreateInstanceOptions): Promise<Result<Instance, AppError>>;
  get(id: string): Promise<Result<Instance, NotFoundError | AppError>>;
  list(): Promise<Result<Instance[], AppError>>;
  start(id: string): Promise<Result<Instance, NotFoundError | AppError>>;
  stop(id: string): Promise<Result<Instance, NotFoundError | AppError>>;
  restart(id: string): Promise<Result<Instance, NotFoundError | AppError>>;
  destroy(id: string): Promise<Result<void, NotFoundError | AppError>>;
  healthCheck(id: string): Promise<Result<boolean, NotFoundError | AppError>>;
  getStats(): Promise<Result<InstanceStats, AppError>>;
  stopAll(): Promise<Result<Instance[], AppError>>;
  destroyAll(): Promise<Result<void, AppError>>;
}

export interface CommandManager {
  execute(options: ExecuteCommandOptions): Promise<Result<ExecuteCommandResult, AppError>>;
}

export interface ExecuteCommandOptions {
  instanceId: string;
  command: string;
  args?: string[];
  timeout?: number;
  onData?: (data: string) => void;
  onError?: (error: string) => void;
}

export interface InstanceStats {
  total: number;
  running: number;
  stopped: number;
  failed: number;
}

// Re-export types from command service
export type { ExecuteCommandResult } from '@/services/command-service';

// Helper function to reduce repetitive validation code
const validateInstanceId = (id: string): Result<string, ValidationError> => {
  try {
    return ok(instanceIdSchema.parse(id));
  } catch (error) {
    if (error instanceof Error) {
      return err(new ValidationError(error.message));
    }
    return err(new ValidationError('Invalid instance ID'));
  }
};

const createInstanceManager = (provider: ComputeProvider): InstanceManager => ({
  create: async (options: CreateInstanceOptions) => {
    try {
      const validated = createInstanceSchema.parse(options);
      return instanceService.createInstance(validated, provider);
    } catch (error) {
      if (error instanceof Error) {
        return err(new ValidationError(error.message));
      }
      return err(new ValidationError('Invalid instance configuration'));
    }
  },

  get: async (id: string) => {
    const validation = validateInstanceId(id);
    if (validation.isErr()) {
      return err(validation.error);
    }
    return instanceService.getInstance(validation.value, provider);
  },

  list: () => instanceService.listInstances(provider),

  start: async (id: string) => {
    const validation = validateInstanceId(id);
    if (validation.isErr()) {
      return err(validation.error);
    }
    return instanceService.startInstance(validation.value, provider);
  },

  stop: async (id: string) => {
    const validation = validateInstanceId(id);
    if (validation.isErr()) {
      return err(validation.error);
    }
    return instanceService.stopInstance(validation.value, provider);
  },

  restart: async (id: string) => {
    const validation = validateInstanceId(id);
    if (validation.isErr()) {
      return err(validation.error);
    }
    return instanceService.restartInstance(validation.value, provider);
  },

  destroy: async (id: string) => {
    const validation = validateInstanceId(id);
    if (validation.isErr()) {
      return err(validation.error);
    }
    return instanceService.destroyInstance(validation.value, provider);
  },

  healthCheck: async (id: string) => {
    const validation = validateInstanceId(id);
    if (validation.isErr()) {
      return err(validation.error);
    }
    return instanceService.healthCheckInstance(validation.value, provider);
  },

  getStats: () => instanceService.getInstanceStats(provider),

  stopAll: () => instanceService.stopAllInstances(provider),

  destroyAll: () => instanceService.destroyAllInstances(provider),
});

const createCommandManager = (provider: ComputeProvider): CommandManager => ({
  execute: async (options: ExecuteCommandOptions) => {
    try {
      // Validate command options first
      const validated = executeCommandSchema.parse(options);

      // Validate instance ID separately
      const validatedInstanceId = instanceIdSchema.parse(options.instanceId);

      // Check instance exists and get machine ID
      const instanceResult = await instanceService.getInstance(validatedInstanceId, provider);
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

      return commandService.executeCommand(
        {
          instanceId: validatedInstanceId,
          machineId: instance.flyMachineId,
          command: validated.command,
          args: validated.args,
          timeout: validated.timeout,
          onData: options.onData,
          onError: options.onError,
        },
        provider,
      );
    } catch (error) {
      if (error instanceof Error) {
        return err(new ValidationError(error.message));
      }
      return err(new ValidationError('Invalid command configuration'));
    }
  },
});

export const createLightfastComputer = (config: LightfastComputerConfig): LightfastComputerSDK => {
  const provider = createProvider(config);

  return {
    instances: createInstanceManager(provider),
    commands: createCommandManager(provider),
  };
};

// Default export for convenience
export default createLightfastComputer;

export {
  AppError,
  InfrastructureError,
  InstanceCreationError,
  InstanceOperationError,
  InstanceStateError,
  NotFoundError,
  ValidationError,
} from '@/lib/error-handler';

// Named exports for types
export type {
  CreateInstanceOptions,
  Instance,
  Logger,
} from '@/types/index';

// Export InstanceStats separately since it's defined in this file
