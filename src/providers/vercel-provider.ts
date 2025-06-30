import { Sandbox } from '@vercel/sandbox';
import { err, ok, type Result } from 'neverthrow';
import type { AppError } from '@/lib/error-handler';
import { InfrastructureError, InstanceCreationError, InstanceOperationError } from '@/lib/error-handler';
import type { Logger } from '@/types/logger';
import type { CommandOptions, CommandResult, ComputeProvider, CreateMachineOptions, Machine } from '@/types/provider';

interface SandboxConfig {
  timeout: number;
  resources: {
    vcpus: number;
  };
  runtime: 'node22' | 'python3.13';
  ports: number[];
  token?: string;
  projectId?: string;
  teamId?: string;
  source?: {
    url: string;
    type: 'git';
  };
}

interface VercelSandboxInstance {
  id: string;
  sandbox: Sandbox;
  state: 'creating' | 'starting' | 'started' | 'stopped' | 'destroyed';
  name: string;
  created_at: string;
  ports: number[];
  domain?: string;
}

export class VercelProvider implements ComputeProvider {
  private instances = new Map<string, VercelSandboxInstance>();

  constructor(
    private readonly vercelToken: string,
    private readonly projectId?: string,
    private readonly teamId?: string,
    private readonly logger: Logger = createSilentLogger(),
  ) {}

  private generateId(): string {
    return `vercel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapToMachine(instance: VercelSandboxInstance): Machine {
    return {
      id: instance.id,
      name: instance.name,
      state: instance.state,
      region: 'iad1', // Vercel Sandbox currently only supports iad1
      created_at: instance.created_at,
      updated_at: new Date().toISOString(),
      image: 'vercel-sandbox', // Default Vercel Sandbox image
      size: 'vercel-sandbox-default',
      private_ip: instance.domain,
    };
  }

  private createSandboxConfig(options: CreateMachineOptions): SandboxConfig {
    const config: SandboxConfig = {
      timeout: 5 * 60 * 1000, // 5 minutes default
      resources: {
        vcpus: 2, // Default to 2 vCPUs
      },
      runtime: 'node22' as const,
      ports: [3000], // Default port
    };

    // Add authentication if provided
    if (this.vercelToken) {
      config.token = this.vercelToken;
    }
    if (this.projectId) {
      config.projectId = this.projectId;
    }
    if (this.teamId) {
      config.teamId = this.teamId;
    }

    // Handle git repository source
    if (options.repoUrl) {
      config.source = {
        url: options.repoUrl,
        type: 'git' as const,
      };
    }

    // Parse size to determine vCPUs
    if (options.size) {
      const vcpus = this.parseSizeToVCPUs(options.size);
      config.resources.vcpus = vcpus;
    }

    return config;
  }

  private parseSizeToVCPUs(size: string): number {
    const sizeMap: Record<string, number> = {
      small: 1,
      medium: 2,
      large: 4,
      xlarge: 8,
    };
    return sizeMap[size] || 2;
  }

  async createMachine(options: CreateMachineOptions): Promise<Result<Machine, AppError>> {
    const id = this.generateId();
    const name = options.name || `vercel-sandbox-${Date.now()}`;

    try {
      this.logger.info(`Creating Vercel Sandbox: ${name}`);

      const sandboxConfig = this.createSandboxConfig(options);

      // Store instance in creating state
      const instance: VercelSandboxInstance = {
        id,
        sandbox: {} as Sandbox, // Will be populated when created
        state: 'creating',
        name,
        created_at: new Date().toISOString(),
        ports: sandboxConfig.ports,
      };

      this.instances.set(id, instance);

      // Create the sandbox
      const sandbox = await Sandbox.create(sandboxConfig);

      // Update instance with sandbox reference and mark as started
      instance.sandbox = sandbox;
      instance.state = 'started';

      // Get domain if ports are exposed
      if (sandboxConfig.ports.length > 0) {
        try {
          instance.domain = sandbox.domain(sandboxConfig.ports[0]);
        } catch (error) {
          this.logger.warn(`Failed to get domain for sandbox ${id}:`, error);
        }
      }

      this.logger.info(`Successfully created Vercel Sandbox: ${id}`);
      return ok(this.mapToMachine(instance));
    } catch (error) {
      this.logger.error('Failed to create Vercel Sandbox:', {
        id,
        name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Remove failed instance
      this.instances.delete(id);

      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
        return err(
          new InstanceCreationError('authentication failed', {
            id,
            name,
            error: errorMessage,
          }),
        );
      }

      if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        return err(
          new InstanceCreationError('rate limit exceeded', {
            id,
            name,
            error: errorMessage,
          }),
        );
      }

      return err(
        new InfrastructureError('compute platform', {
          id,
          name,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        }),
      );
    }
  }

  async getMachine(machineId: string): Promise<Result<Machine, AppError>> {
    const instance = this.instances.get(machineId);

    if (!instance) {
      return err(
        new InstanceOperationError('retrieve', 'instance not found', {
          machineId,
        }),
      );
    }

    return ok(this.mapToMachine(instance));
  }

  async listMachines(): Promise<Result<Machine[], AppError>> {
    try {
      const machines = Array.from(this.instances.values()).map((instance) => this.mapToMachine(instance));
      return ok(machines);
    } catch (error) {
      this.logger.error('Failed to list Vercel Sandboxes:', {
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        new InfrastructureError('compute platform', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  async startMachine(machineId: string): Promise<Result<Machine, AppError>> {
    const instance = this.instances.get(machineId);

    if (!instance) {
      return err(
        new InstanceOperationError('start', 'instance not found', {
          machineId,
        }),
      );
    }

    // Vercel Sandboxes start automatically when created
    // This is more of a status check operation
    if (instance.state === 'stopped') {
      instance.state = 'started';
      this.logger.info(`Started Vercel Sandbox: ${machineId}`);
    }

    return ok(this.mapToMachine(instance));
  }

  async stopMachine(machineId: string): Promise<Result<Machine, AppError>> {
    const instance = this.instances.get(machineId);

    if (!instance) {
      return err(
        new InstanceOperationError('stop', 'instance not found', {
          machineId,
        }),
      );
    }

    try {
      // Stop the sandbox
      if (instance.sandbox) {
        await instance.sandbox.stop();
      }

      instance.state = 'stopped';
      this.logger.info(`Stopped Vercel Sandbox: ${machineId}`);

      return ok(this.mapToMachine(instance));
    } catch (error) {
      this.logger.error('Failed to stop Vercel Sandbox:', {
        machineId,
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        new InstanceOperationError('stop', error instanceof Error ? error.message : String(error), {
          machineId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  async destroyMachine(machineId: string): Promise<Result<void, AppError>> {
    const instance = this.instances.get(machineId);

    if (!instance) {
      return err(
        new InstanceOperationError('destroy', 'instance not found', {
          machineId,
        }),
      );
    }

    try {
      // Stop the sandbox first if it's running
      if (instance.sandbox) {
        await instance.sandbox.stop();
      }

      // Remove from our tracking
      this.instances.delete(machineId);
      this.logger.info(`Destroyed Vercel Sandbox: ${machineId}`);

      return ok(undefined);
    } catch (error) {
      this.logger.error('Failed to destroy Vercel Sandbox:', {
        machineId,
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        new InstanceOperationError('destroy', error instanceof Error ? error.message : String(error), {
          machineId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  async executeCommand(machineId: string, command: CommandOptions): Promise<Result<CommandResult, AppError>> {
    const instance = this.instances.get(machineId);

    if (!instance) {
      return err(
        new InstanceOperationError('execute', 'instance not found', {
          machineId,
        }),
      );
    }

    if (!instance.sandbox) {
      return err(
        new InstanceOperationError('execute', 'sandbox not available or not running', {
          machineId,
        }),
      );
    }

    try {
      this.logger.info(`Executing command on Vercel Sandbox ${machineId}: ${command.command}`);

      // Parse command into cmd and args
      const [cmd, ...args] = command.command.split(' ');

      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      // Create streams to capture output
      const { Writable } = await import('node:stream');

      const stdoutStream = new Writable({
        write(chunk, _encoding, callback) {
          stdout += chunk.toString();
          callback();
        },
      });

      const stderrStream = new Writable({
        write(chunk, _encoding, callback) {
          stderr += chunk.toString();
          callback();
        },
      });

      try {
        const result = await instance.sandbox.runCommand({
          cmd,
          args,
          stdout: stdoutStream,
          stderr: stderrStream,
        });

        exitCode = result.exitCode;
      } catch (commandError) {
        // Command failed, but we still want to return the output
        exitCode = 1;
        if (commandError instanceof Error) {
          stderr += commandError.message;
        }
      }

      const commandResult: CommandResult = {
        stdout,
        stderr,
        exitCode,
      };

      this.logger.debug('Command execution result:', {
        machineId,
        command: command.command,
        exitCode,
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
      });

      return ok(commandResult);
    } catch (error) {
      this.logger.error('Failed to execute command on Vercel Sandbox:', {
        machineId,
        command: command.command,
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        new InstanceOperationError('execute', error instanceof Error ? error.message : String(error), {
          machineId,
          command: command.command,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
}

const createSilentLogger = (): Logger => ({
  info: () => {},
  error: () => {},
  debug: () => {},
  warn: () => {},
  level: 'silent',
});
