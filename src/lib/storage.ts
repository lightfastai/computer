import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';
import type { AppError } from '@/lib/error-handler';
import { InfrastructureError } from '@/lib/error-handler';
import type { Instance } from '@/types/index';

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

export interface InstanceStorage {
  // Instance operations
  saveInstance(instance: Instance): Promise<Result<void, AppError>>;
  getInstance(id: string): Promise<Result<Instance | null, AppError>>;
  listInstances(): Promise<Result<Instance[], AppError>>;
  deleteInstance(id: string): Promise<Result<void, AppError>>;
  updateInstanceStatus(id: string, status: Instance['status']): Promise<Result<void, AppError>>;

  // Command operations  
  saveCommandExecution(execution: CommandExecution): Promise<Result<void, AppError>>;
  getCommandHistory(instanceId: string): Promise<Result<CommandExecution[], AppError>>;
  clearCommandHistory(instanceId: string): Promise<Result<void, AppError>>;
  clearAllCommandHistory(): Promise<Result<void, AppError>>;

  // Maintenance operations
  cleanup(): Promise<Result<void, AppError>>;
}

export class InMemoryStorage implements InstanceStorage {
  private instances = new Map<string, Instance>();
  private commandHistory = new Map<string, CommandExecution[]>();

  async saveInstance(instance: Instance): Promise<Result<void, AppError>> {
    try {
      this.instances.set(instance.id, { ...instance });
      return ok(undefined);
    } catch (error) {
      return err(new InfrastructureError('Failed to save instance'));
    }
  }

  async getInstance(id: string): Promise<Result<Instance | null, AppError>> {
    try {
      const instance = this.instances.get(id);
      return ok(instance ? { ...instance } : null);
    } catch (error) {
      return err(new InfrastructureError('Failed to get instance'));
    }
  }

  async listInstances(): Promise<Result<Instance[], AppError>> {
    try {
      const instances = Array.from(this.instances.values()).map(instance => ({ ...instance }));
      
      // Filter out destroyed instances older than 1 hour
      const activeInstances = instances.filter((instance) => {
        if (instance.status === 'destroyed') {
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return instance.updatedAt > hourAgo;
        }
        return true;
      });

      return ok(activeInstances);
    } catch (error) {
      return err(new InfrastructureError('Failed to list instances'));
    }
  }

  async deleteInstance(id: string): Promise<Result<void, AppError>> {
    try {
      this.instances.delete(id);
      this.commandHistory.delete(id);
      return ok(undefined);
    } catch (error) {
      return err(new InfrastructureError('Failed to delete instance'));
    }
  }

  async updateInstanceStatus(id: string, status: Instance['status']): Promise<Result<void, AppError>> {
    try {
      const instance = this.instances.get(id);
      if (instance) {
        instance.status = status;
        instance.updatedAt = new Date();
        this.instances.set(id, instance);
      }
      return ok(undefined);
    } catch (error) {
      return err(new InfrastructureError('Failed to update instance status'));
    }
  }

  async saveCommandExecution(execution: CommandExecution): Promise<Result<void, AppError>> {
    try {
      const history = this.commandHistory.get(execution.instanceId) || [];
      history.push({ ...execution });

      // Keep only last 100 commands per instance
      if (history.length > 100) {
        history.shift();
      }

      this.commandHistory.set(execution.instanceId, history);
      return ok(undefined);
    } catch (error) {
      return err(new InfrastructureError('Failed to save command execution'));
    }
  }

  async getCommandHistory(instanceId: string): Promise<Result<CommandExecution[], AppError>> {
    try {
      const history = this.commandHistory.get(instanceId) || [];
      return ok(history.map(cmd => ({ ...cmd })));
    } catch (error) {
      return err(new InfrastructureError('Failed to get command history'));
    }
  }

  async clearCommandHistory(instanceId: string): Promise<Result<void, AppError>> {
    try {
      this.commandHistory.delete(instanceId);
      return ok(undefined);
    } catch (error) {
      return err(new InfrastructureError('Failed to clear command history'));
    }
  }

  async clearAllCommandHistory(): Promise<Result<void, AppError>> {
    try {
      this.commandHistory.clear();
      return ok(undefined);
    } catch (error) {
      return err(new InfrastructureError('Failed to clear all command history'));
    }
  }

  async cleanup(): Promise<Result<void, AppError>> {
    try {
      // Remove destroyed instances older than 1 hour
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const instancesToRemove: string[] = [];

      for (const [id, instance] of this.instances) {
        if (instance.status === 'destroyed' && instance.updatedAt < hourAgo) {
          instancesToRemove.push(id);
        }
      }

      for (const id of instancesToRemove) {
        this.instances.delete(id);
        this.commandHistory.delete(id);
      }

      return ok(undefined);
    } catch (error) {
      return err(new InfrastructureError('Failed to cleanup storage'));
    }
  }

  // Additional methods for testing
  clearAllInstances(): void {
    this.instances.clear();
    this.commandHistory.clear();
  }

  getInstanceCount(): number {
    return this.instances.size;
  }
}

// File-based storage implementation (for persistence across restarts)
export class FileStorage implements InstanceStorage {
  private memoryStorage = new InMemoryStorage();
  private instancesFile: string;
  private commandsFile: string;

  constructor(dataDir = './data') {
    this.instancesFile = `${dataDir}/instances.json`;
    this.commandsFile = `${dataDir}/commands.json`;
  }

  async saveInstance(instance: Instance): Promise<Result<void, AppError>> {
    const result = await this.memoryStorage.saveInstance(instance);
    if (result.isOk()) {
      await this.persistInstances();
    }
    return result;
  }

  async getInstance(id: string): Promise<Result<Instance | null, AppError>> {
    return this.memoryStorage.getInstance(id);
  }

  async listInstances(): Promise<Result<Instance[], AppError>> {
    return this.memoryStorage.listInstances();
  }

  async deleteInstance(id: string): Promise<Result<void, AppError>> {
    const result = await this.memoryStorage.deleteInstance(id);
    if (result.isOk()) {
      await this.persistInstances();
      await this.persistCommands();
    }
    return result;
  }

  async updateInstanceStatus(id: string, status: Instance['status']): Promise<Result<void, AppError>> {
    const result = await this.memoryStorage.updateInstanceStatus(id, status);
    if (result.isOk()) {
      await this.persistInstances();
    }
    return result;
  }

  async saveCommandExecution(execution: CommandExecution): Promise<Result<void, AppError>> {
    const result = await this.memoryStorage.saveCommandExecution(execution);
    if (result.isOk()) {
      await this.persistCommands();
    }
    return result;
  }

  async getCommandHistory(instanceId: string): Promise<Result<CommandExecution[], AppError>> {
    return this.memoryStorage.getCommandHistory(instanceId);
  }

  async clearCommandHistory(instanceId: string): Promise<Result<void, AppError>> {
    const result = await this.memoryStorage.clearCommandHistory(instanceId);
    if (result.isOk()) {
      await this.persistCommands();
    }
    return result;
  }

  async clearAllCommandHistory(): Promise<Result<void, AppError>> {
    const result = await this.memoryStorage.clearAllCommandHistory();
    if (result.isOk()) {
      await this.persistCommands();
    }
    return result;
  }

  async cleanup(): Promise<Result<void, AppError>> {
    const result = await this.memoryStorage.cleanup();
    if (result.isOk()) {
      await this.persistInstances();
      await this.persistCommands();
    }
    return result;
  }

  async loadFromDisk(): Promise<Result<void, AppError>> {
    try {
      // Load instances
      try {
        const instancesData = await Bun.file(this.instancesFile).text();
        const instancesArray = JSON.parse(instancesData) as Instance[];
        for (const instance of instancesArray) {
          // Convert date strings back to Date objects
          instance.createdAt = new Date(instance.createdAt);
          instance.updatedAt = new Date(instance.updatedAt);
          await this.memoryStorage.saveInstance(instance);
        }
      } catch {
        // File doesn't exist or is empty, that's OK
      }

      // Load commands
      try {
        const commandsData = await Bun.file(this.commandsFile).text();
        const commandsMap = JSON.parse(commandsData) as Record<string, CommandExecution[]>;
        for (const [, executions] of Object.entries(commandsMap)) {
          for (const execution of executions) {
            // Convert date strings back to Date objects
            execution.startedAt = new Date(execution.startedAt);
            if (execution.completedAt) {
              execution.completedAt = new Date(execution.completedAt);
            }
            await this.memoryStorage.saveCommandExecution(execution);
          }
        }
      } catch {
        // File doesn't exist or is empty, that's OK
      }

      return ok(undefined);
    } catch (error) {
      return err(new InfrastructureError('Failed to load data from disk'));
    }
  }

  private async persistInstances(): Promise<void> {
    try {
      const instancesResult = await this.memoryStorage.listInstances();
      if (instancesResult.isOk()) {
        await Bun.write(this.instancesFile, JSON.stringify(instancesResult.value, null, 2));
      }
    } catch {
      // Ignore persistence errors for now
    }
  }

  private async persistCommands(): Promise<void> {
    try {
      // This is a simplified approach - in a real implementation,
      // we'd want to be more efficient about this
      const commandsMap: Record<string, CommandExecution[]> = {};
      
      const instancesResult = await this.memoryStorage.listInstances();
      if (instancesResult.isOk()) {
        for (const instance of instancesResult.value) {
          const historyResult = await this.memoryStorage.getCommandHistory(instance.id);
          if (historyResult.isOk() && historyResult.value.length > 0) {
            commandsMap[instance.id] = historyResult.value;
          }
        }
      }

      await Bun.write(this.commandsFile, JSON.stringify(commandsMap, null, 2));
    } catch {
      // Ignore persistence errors for now
    }
  }
}

// Default storage instance
let defaultStorage: InstanceStorage = new InMemoryStorage();

export const getStorage = (): InstanceStorage => defaultStorage;

export const setStorage = (storage: InstanceStorage): void => {
  defaultStorage = storage;
};