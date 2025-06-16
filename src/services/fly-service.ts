import { config } from '@/lib/config';
import { AppError } from '@/lib/error-handler';
import type { CreateInstanceOptions } from '@/types/index';
import pino from 'pino';

const log = pino();

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
  };
  created_at: string;
}

// Constants
const API_URL = 'https://api.machines.dev/v1';
const APP_NAME = 'lightfast-worker-instances';

// Create headers for API requests
const createHeaders = () => ({
  Authorization: `Bearer ${config.flyApiToken}`,
  'Content-Type': 'application/json',
});

// Parse machine size configuration
export const parseMachineSize = (size: string): { kind: string; cpus: number } => {
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
};

// Create machine configuration
const createMachineConfig = (options: CreateInstanceOptions) => {
  const { name, region, image, size, memoryMb, metadata, sshKeyContent } = options;
  const cpuConfig = parseMachineSize(size || 'shared-cpu-1x');

  const machineConfig = {
    name: name || `instance-${Date.now()}`,
    region: region || 'iad',
    config: {
      image: image || 'ubuntu-22.04',
      guest: {
        cpu_kind: cpuConfig.kind,
        cpus: cpuConfig.cpus,
        memory_mb: memoryMb || 512,
      },
      services: [
        {
          ports: [
            {
              port: 22,
              handlers: ['tls'],
            },
          ],
          protocol: 'tcp',
          internal_port: 22,
        },
      ],
      env: {
        ...metadata,
      },
    },
  };

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

  return machineConfig;
};

// Create a new Fly machine
export const createMachine = async (options: CreateInstanceOptions): Promise<FlyMachine> => {
  const machineConfig = createMachineConfig(options);

  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(machineConfig),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AppError(`Failed to create Fly machine: ${error}`, response.status);
    }

    const machine = await response.json();
    log.info(`Created Fly machine: ${machine.id}`);

    // Wait for machine to be ready
    await waitForMachineReady(machine.id);

    return machine;
  } catch (error) {
    log.error('Failed to create Fly machine:', error);
    throw error;
  }
};

// Get machine details
export const getMachine = async (machineId: string): Promise<FlyMachine> => {
  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines/${machineId}`, {
      method: 'GET',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AppError(`Failed to get Fly machine: ${error}`, response.status);
    }

    return await response.json();
  } catch (error) {
    log.error(`Failed to get Fly machine ${machineId}:`, error);
    throw error;
  }
};

// List all machines
export const listMachines = async (): Promise<FlyMachine[]> => {
  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines`, {
      method: 'GET',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AppError(`Failed to list Fly machines: ${error}`, response.status);
    }

    return await response.json();
  } catch (error) {
    log.error('Failed to list Fly machines:', error);
    throw error;
  }
};

// Destroy a machine
export const destroyMachine = async (machineId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines/${machineId}`, {
      method: 'DELETE',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AppError(`Failed to destroy Fly machine: ${error}`, response.status);
    }

    log.info(`Destroyed Fly machine: ${machineId}`);
  } catch (error) {
    log.error(`Failed to destroy Fly machine ${machineId}:`, error);
    throw error;
  }
};

// Stop a machine
export const stopMachine = async (machineId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines/${machineId}/stop`, {
      method: 'POST',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AppError(`Failed to stop Fly machine: ${error}`, response.status);
    }

    log.info(`Stopped Fly machine: ${machineId}`);
  } catch (error) {
    log.error(`Failed to stop Fly machine ${machineId}:`, error);
    throw error;
  }
};

// Start a machine
export const startMachine = async (machineId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines/${machineId}/start`, {
      method: 'POST',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AppError(`Failed to start Fly machine: ${error}`, response.status);
    }

    log.info(`Started Fly machine: ${machineId}`);
    await waitForMachineReady(machineId);
  } catch (error) {
    log.error(`Failed to start Fly machine ${machineId}:`, error);
    throw error;
  }
};

// Wait for machine to be ready
export const waitForMachineReady = async (machineId: string, maxAttempts = 30): Promise<void> => {
  log.info(`Waiting for machine ${machineId} to be ready...`);

  for (let i = 0; i < maxAttempts; i++) {
    const machine = await getMachine(machineId);

    if (machine.state === 'started') {
      log.info(`Machine ${machineId} is ready`);
      return;
    }

    if (machine.state === 'failed' || machine.state === 'destroyed') {
      throw new AppError(`Machine ${machineId} failed to start: ${machine.state}`);
    }

    log.debug(`Waiting for machine ${machineId}, current state: ${machine.state}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new AppError(`Machine ${machineId} failed to become ready in time`);
};
