import { config } from '../lib/config';
import pino from 'pino';
import { AppError } from '../lib/error-handler';
import { CreateInstanceOptions } from '../types';

const log = pino();

interface FlyMachine {
  id: string;
  name: string;
  state: string;
  region: string;
  image_ref: {
    registry: string;
    repository: string;
    tag: string;
    digest: string;
  };
  instance_id: string;
  private_ip: string;
  created_at: string;
  updated_at: string;
  config: {
    guest: {
      cpu_kind: string;
      cpus: number;
      memory_mb: number;
    };
    env?: Record<string, string>;
    metadata?: Record<string, string>;
  };
}

export class FlyService {
  private apiUrl = 'https://api.machines.dev/v1';
  private headers: Record<string, string>;

  constructor() {
    this.headers = {
      'Authorization': `Bearer ${config.flyApiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async createMachine(options: CreateInstanceOptions): Promise<FlyMachine> {
    const { name, region, image, size, memoryMb, metadata, sshKeyContent } = options;

    // Parse CPU configuration from size
    const cpuConfig = this.parseMachineSize(size || config.defaultMachineSize);

    const machineConfig = {
      name: name || `instance-${Date.now()}`,
      region: region || config.defaultRegion,
      config: {
        image: image || config.defaultImage,
        guest: {
          cpu_kind: cpuConfig.kind,
          cpus: cpuConfig.cpus,
          memory_mb: memoryMb || config.defaultMemoryMb,
        },
        env: {
          // Add any default environment variables
          DEBIAN_FRONTEND: 'noninteractive',
        },
        metadata: metadata || {},
        services: [],
        auto_destroy: false,
      },
    };

    // Add SSH key if provided
    if (sshKeyContent) {
      machineConfig.config.env.SSH_PUBLIC_KEY = sshKeyContent;
      // Add init script to set up SSH key
      (machineConfig.config as any).init = {
        exec: [
          'sh',
          '-c',
          'mkdir -p /root/.ssh && echo "$SSH_PUBLIC_KEY" > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys',
        ],
      };
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/apps/lightfast-worker-instances/machines`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(machineConfig),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new AppError(`Failed to create Fly machine: ${error}`, response.status);
      }

      const machine = await response.json();
      log.info(`Created Fly machine: ${machine.id}`);

      // Wait for machine to be ready
      await this.waitForMachineReady(machine.id);

      return machine;
    } catch (error) {
      log.error('Failed to create Fly machine:', error);
      throw error;
    }
  }

  async getMachine(machineId: string): Promise<FlyMachine> {
    try {
      const response = await fetch(
        `${this.apiUrl}/apps/lightfast-worker-instances/machines/${machineId}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new AppError(`Failed to get Fly machine: ${error}`, response.status);
      }

      return await response.json();
    } catch (error) {
      log.error(`Failed to get Fly machine ${machineId}:`, error);
      throw error;
    }
  }

  async listMachines(): Promise<FlyMachine[]> {
    try {
      const response = await fetch(
        `${this.apiUrl}/apps/lightfast-worker-instances/machines`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new AppError(`Failed to list Fly machines: ${error}`, response.status);
      }

      return await response.json();
    } catch (error) {
      log.error('Failed to list Fly machines:', error);
      throw error;
    }
  }

  async destroyMachine(machineId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiUrl}/apps/lightfast-worker-instances/machines/${machineId}`,
        {
          method: 'DELETE',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new AppError(`Failed to destroy Fly machine: ${error}`, response.status);
      }

      log.info(`Destroyed Fly machine: ${machineId}`);
    } catch (error) {
      log.error(`Failed to destroy Fly machine ${machineId}:`, error);
      throw error;
    }
  }

  async stopMachine(machineId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiUrl}/apps/lightfast-worker-instances/machines/${machineId}/stop`,
        {
          method: 'POST',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new AppError(`Failed to stop Fly machine: ${error}`, response.status);
      }

      log.info(`Stopped Fly machine: ${machineId}`);
    } catch (error) {
      log.error(`Failed to stop Fly machine ${machineId}:`, error);
      throw error;
    }
  }

  async startMachine(machineId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiUrl}/apps/lightfast-worker-instances/machines/${machineId}/start`,
        {
          method: 'POST',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new AppError(`Failed to start Fly machine: ${error}`, response.status);
      }

      log.info(`Started Fly machine: ${machineId}`);
      await this.waitForMachineReady(machineId);
    } catch (error) {
      log.error(`Failed to start Fly machine ${machineId}:`, error);
      throw error;
    }
  }

  private async waitForMachineReady(machineId: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const machine = await this.getMachine(machineId);

      if (machine.state === 'started') {
        log.info(`Machine ${machineId} is ready`);
        return;
      }

      if (machine.state === 'failed' || machine.state === 'destroyed') {
        throw new AppError(`Machine ${machineId} failed to start: ${machine.state}`);
      }

      log.debug(`Waiting for machine ${machineId}, current state: ${machine.state}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new AppError(`Machine ${machineId} failed to become ready in time`);
  }

  private parseMachineSize(size: string): { kind: string; cpus: number } {
    // Parse Fly.io machine sizes
    const sizeMap: Record<string, { kind: string; cpus: number }> = {
      'shared-cpu-1x': { kind: 'shared', cpus: 1 },
      'shared-cpu-2x': { kind: 'shared', cpus: 2 },
      'shared-cpu-4x': { kind: 'shared', cpus: 4 },
      'shared-cpu-8x': { kind: 'shared', cpus: 8 },
      'performance-1x': { kind: 'performance', cpus: 1 },
      'performance-2x': { kind: 'performance', cpus: 2 },
      'performance-4x': { kind: 'performance', cpus: 4 },
      'performance-8x': { kind: 'performance', cpus: 8 },
      'performance-16x': { kind: 'performance', cpus: 16 },
    };

    return sizeMap[size] || { kind: 'shared', cpus: 1 };
  }
}
