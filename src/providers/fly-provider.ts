import { err, ok, type Result } from 'neverthrow';
import type { AppError } from '@/lib/error-handler';
import { InfrastructureError, InstanceCreationError, InstanceOperationError } from '@/lib/error-handler';
import type { Logger } from '@/types/logger';
import type { CommandOptions, CommandResult, ComputeProvider, CreateMachineOptions, Machine } from '@/types/provider';

const API_URL = 'https://api.machines.dev/v1';

interface FlyMachine {
  id: string;
  name: string;
  state: string;
  region: string;
  image: string;
  instance_id: string;
  private_ip: string;
  config: {
    image: string;
    guest: {
      cpu_kind: string;
      cpus: number;
      memory_mb: number;
    };
    services: Array<{
      ports: Array<{
        port: number;
        handlers: string[];
      }>;
      protocol: string;
      internal_port: number;
    }>;
    env: Record<string, string>;
    init?: {
      exec: string[];
    };
  };
  created_at: string;
}

interface MachineConfig {
  name: string;
  region: string;
  config: {
    image: string;
    guest: {
      cpu_kind: string;
      cpus: number;
      memory_mb: number;
    };
    services: Array<{
      ports: Array<{
        port: number;
        handlers: string[];
      }>;
      protocol: string;
      internal_port: number;
    }>;
    env: Record<string, unknown>;
    init?: {
      exec: string[];
    };
  };
}

export class FlyProvider implements ComputeProvider {
  constructor(
    private readonly flyApiToken: string,
    private readonly appName: string,
    private readonly logger: Logger,
  ) {}

  private createHeaders() {
    const token = this.flyApiToken.trim();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private parseMachineSize(size: string): { kind: string; cpus: number } {
    const sizeMap: Record<string, { kind: string; cpus: number }> = {
      'shared-cpu-1x': { kind: 'shared', cpus: 1 },
      'shared-cpu-2x': { kind: 'shared', cpus: 2 },
      'shared-cpu-4x': { kind: 'shared', cpus: 4 },
      'shared-cpu-8x': { kind: 'shared', cpus: 8 },
      'performance-1x': { kind: 'performance', cpus: 1 },
      'performance-2x': { kind: 'performance', cpus: 2 },
      'performance-4x': { kind: 'performance', cpus: 4 },
      'performance-8x': { kind: 'performance', cpus: 8 },
    };

    return sizeMap[size] || { kind: 'shared', cpus: 1 };
  }

  private createMachineConfig(options: CreateMachineOptions): MachineConfig {
    const { name, region, image, size, githubToken, githubUsername, repoUrl, metadata } = options;
    const cpuConfig = this.parseMachineSize(size || 'shared-cpu-1x');

    const machineConfig: MachineConfig = {
      name: name || `instance-${Date.now()}`,
      region: region || 'iad',
      config: {
        image: image || 'docker.io/library/ubuntu:22.04',
        guest: {
          cpu_kind: cpuConfig.kind,
          cpus: cpuConfig.cpus,
          memory_mb: 512,
        },
        services: [],
        env: {
          ...metadata,
          DEBIAN_FRONTEND: 'noninteractive',
          TZ: 'UTC',
          ...(githubToken && {
            GITHUB_TOKEN: githubToken,
            GITHUB_USERNAME: githubUsername || 'x-access-token',
          }),
        },
        init: {
          exec: [
            '/bin/bash',
            '-c',
            `
            # Update and install essential packages
            apt-get update && apt-get install -y --no-install-recommends \
              git \
              curl \
              ca-certificates \
              openssh-client \
              && rm -rf /var/lib/apt/lists/*

            # Configure Git credential helper
            git config --global credential.helper 'cache --timeout=86400'

            # Set up GitHub authentication if token provided
            if [ -n "$GITHUB_TOKEN" ]; then
              git config --global url."https://\${GITHUB_USERNAME:-x-access-token}:\${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
              git config --global user.name "\${GITHUB_USERNAME:-Fly-Instance}"
              git config --global user.email "\${GITHUB_USERNAME:-fly}@instance.local"
            fi

            # Clone repository if URL provided
            if [ -n "${repoUrl || ''}" ]; then
              git clone "${repoUrl}" /workspace
              cd /workspace
            fi

            # Keep container running
            tail -f /dev/null
            `,
          ],
        },
      },
    };

    return machineConfig;
  }

  private mapFlyMachineToMachine(flyMachine: FlyMachine): Machine {
    return {
      id: flyMachine.id,
      name: flyMachine.name,
      state: flyMachine.state,
      region: flyMachine.region,
      created_at: flyMachine.created_at,
      updated_at: new Date().toISOString(),
      image: flyMachine.config.image,
      size: 'shared-cpu-1x', // Default since Fly doesn't expose this directly
      private_ip: flyMachine.private_ip,
    };
  }

  private async waitForMachineReady(
    machineId: string,
    maxAttempts = 30,
  ): Promise<Result<void, InstanceOperationError | InfrastructureError>> {
    this.logger.info(`Waiting for machine ${machineId} to be ready...`);

    for (let i = 0; i < maxAttempts; i++) {
      const machineResult = await this.getMachine(machineId);

      if (machineResult.isErr()) {
        return err(machineResult.error);
      }

      const machine = machineResult.value;

      if (machine.state === 'started') {
        this.logger.info(`Machine ${machineId} is ready`);
        return ok(undefined);
      }

      if (machine.state === 'failed' || machine.state === 'destroyed') {
        this.logger.error('Machine failed to start:', {
          machineId,
          state: machine.state,
          attempt: i + 1,
          maxAttempts,
        });

        return err(
          new InstanceOperationError('start', `instance entered ${machine.state} state`, {
            machineId,
            state: machine.state,
            attempt: i + 1,
            maxAttempts,
          }),
        );
      }

      this.logger.debug(`Waiting for machine ${machineId}, current state: ${machine.state}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    this.logger.error('Machine failed to become ready in time:', {
      machineId,
      maxAttempts,
      timeoutSeconds: maxAttempts * 2,
    });

    return err(
      new InstanceOperationError('start', 'timeout waiting for instance to become ready', {
        machineId,
        maxAttempts,
        timeoutSeconds: maxAttempts * 2,
      }),
    );
  }

  async createMachine(options: CreateMachineOptions): Promise<Result<Machine, AppError>> {
    const machineConfig = this.createMachineConfig(options);

    try {
      const response = await fetch(`${API_URL}/apps/${this.appName}/machines`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(machineConfig),
      });

      if (!response.ok) {
        const errorText = await response.text();

        this.logger.error('Fly.io machine creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          config: machineConfig,
        });

        console.error('Fly.io Error Details:', {
          status: response.status,
          error: errorText,
        });

        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          appName: this.appName,
          machineConfig,
        };

        if (response.status >= 500) {
          return err(new InfrastructureError('compute platform', errorDetails));
        }
        if (response.status === 422) {
          return err(new InstanceCreationError('invalid configuration', errorDetails));
        }
        if (response.status === 429) {
          return err(new InstanceCreationError('rate limit exceeded', errorDetails));
        }
        return err(new InstanceCreationError(undefined, errorDetails));
      }

      const flyMachine = (await response.json()) as FlyMachine;
      this.logger.info(`Created Fly machine: ${flyMachine.id}`);

      const readyResult = await this.waitForMachineReady(flyMachine.id);
      if (readyResult.isErr()) {
        return err(readyResult.error);
      }

      return ok(this.mapFlyMachineToMachine(flyMachine));
    } catch (error) {
      this.logger.error('Unexpected error creating Fly machine:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        config: machineConfig,
      });

      return err(
        new InfrastructureError('compute platform', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          machineConfig,
        }),
      );
    }
  }

  async getMachine(machineId: string): Promise<Result<Machine, AppError>> {
    try {
      const response = await fetch(`${API_URL}/apps/${this.appName}/machines/${machineId}`, {
        method: 'GET',
        headers: this.createHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();

        this.logger.error('Failed to get Fly machine:', {
          machineId,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          machineId,
          appName: this.appName,
        };

        if (response.status >= 500) {
          return err(new InfrastructureError('compute platform', errorDetails));
        }
        if (response.status === 404) {
          return err(new InstanceOperationError('retrieve', 'instance not found', errorDetails));
        }
        return err(new InstanceOperationError('retrieve', undefined, errorDetails));
      }

      const flyMachine = (await response.json()) as FlyMachine;
      return ok(this.mapFlyMachineToMachine(flyMachine));
    } catch (error) {
      this.logger.error('Unexpected error getting Fly machine:', {
        machineId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return err(
        new InfrastructureError('compute platform', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          machineId,
        }),
      );
    }
  }

  async listMachines(): Promise<Result<Machine[], AppError>> {
    try {
      const response = await fetch(`${API_URL}/apps/${this.appName}/machines`, {
        method: 'GET',
        headers: this.createHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();

        this.logger.error('Failed to list Fly machines:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          appName: this.appName,
        };

        if (response.status >= 500) {
          return err(new InfrastructureError('compute platform', errorDetails));
        }
        return err(new InstanceOperationError('list', undefined, errorDetails));
      }

      const flyMachines = (await response.json()) as FlyMachine[];
      const machines = flyMachines.map((fm) => this.mapFlyMachineToMachine(fm));
      return ok(machines);
    } catch (error) {
      this.logger.error('Unexpected error listing Fly machines:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return err(
        new InfrastructureError('compute platform', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }),
      );
    }
  }

  async startMachine(machineId: string): Promise<Result<Machine, AppError>> {
    try {
      const response = await fetch(`${API_URL}/apps/${this.appName}/machines/${machineId}/start`, {
        method: 'POST',
        headers: this.createHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();

        this.logger.error('Failed to start Fly machine:', {
          machineId,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          machineId,
          appName: this.appName,
        };

        if (response.status >= 500) {
          return err(new InfrastructureError('compute platform', errorDetails));
        }
        if (response.status === 404) {
          return err(new InstanceOperationError('start', 'instance not found', errorDetails));
        }
        return err(new InstanceOperationError('start', undefined, errorDetails));
      }

      this.logger.info(`Started Fly machine: ${machineId}`);

      const readyResult = await this.waitForMachineReady(machineId);
      if (readyResult.isErr()) {
        return err(readyResult.error);
      }

      return this.getMachine(machineId);
    } catch (error) {
      this.logger.error('Unexpected error starting Fly machine:', {
        machineId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return err(
        new InfrastructureError('compute platform', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          machineId,
        }),
      );
    }
  }

  async stopMachine(machineId: string): Promise<Result<Machine, AppError>> {
    try {
      const response = await fetch(`${API_URL}/apps/${this.appName}/machines/${machineId}/stop`, {
        method: 'POST',
        headers: this.createHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();

        this.logger.error('Failed to stop Fly machine:', {
          machineId,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          machineId,
          appName: this.appName,
        };

        if (response.status >= 500) {
          return err(new InfrastructureError('compute platform', errorDetails));
        }
        if (response.status === 404) {
          return err(new InstanceOperationError('stop', 'instance not found', errorDetails));
        }
        return err(new InstanceOperationError('stop', undefined, errorDetails));
      }

      this.logger.info(`Stopped Fly machine: ${machineId}`);
      return this.getMachine(machineId);
    } catch (error) {
      this.logger.error('Unexpected error stopping Fly machine:', {
        machineId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return err(
        new InfrastructureError('compute platform', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          machineId,
        }),
      );
    }
  }

  async destroyMachine(machineId: string): Promise<Result<void, AppError>> {
    try {
      const response = await fetch(`${API_URL}/apps/${this.appName}/machines/${machineId}`, {
        method: 'DELETE',
        headers: this.createHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();

        this.logger.error('Failed to destroy Fly machine:', {
          machineId,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          machineId,
          appName: this.appName,
        };

        if (response.status >= 500) {
          return err(new InfrastructureError('compute platform', errorDetails));
        }
        if (response.status === 404) {
          return err(new InstanceOperationError('destroy', 'instance not found', errorDetails));
        }
        return err(new InstanceOperationError('destroy', undefined, errorDetails));
      }

      this.logger.info(`Destroyed Fly machine: ${machineId}`);
      return ok(undefined);
    } catch (error) {
      this.logger.error('Unexpected error destroying Fly machine:', {
        machineId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return err(
        new InfrastructureError('compute platform', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          machineId,
        }),
      );
    }
  }

  async executeCommand(machineId: string, command: CommandOptions): Promise<Result<CommandResult, AppError>> {
    try {
      const response = await fetch(`${API_URL}/apps/${this.appName}/machines/${machineId}/exec`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify({
          cmd: command.command,
          timeout: Math.floor((command.timeout || 30000) / 1000), // Convert to seconds
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        this.logger.error('Command execution failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: response.url,
        });

        console.error('Command execution failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: response.url,
        });

        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          machineId,
          command: command.command,
        };

        if (response.status >= 500) {
          return err(new InfrastructureError('compute platform', errorDetails));
        }
        if (response.status === 404) {
          return err(new InstanceOperationError('execute', 'Machine not found', errorDetails));
        }
        return err(new InstanceOperationError('execute', undefined, errorDetails));
      }

      const result = (await response.json()) as {
        stdout?: string;
        stderr?: string;
        exit_code?: number;
      };

      return ok({
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exit_code || 0,
      });
    } catch (error) {
      this.logger.error('Unexpected error executing command:', {
        machineId,
        command: command.command,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return err(
        new InfrastructureError('compute platform', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          machineId,
          command: command.command,
        }),
      );
    }
  }
}
