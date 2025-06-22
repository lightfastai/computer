import { err, ok, type Result } from 'neverthrow';
import pino from 'pino';
import { config } from '@/lib/config';
import { InfrastructureError, InstanceCreationError, InstanceOperationError } from '@/lib/error-handler';
import type { CreateInstanceOptions } from '@/types/index';

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
    init?: {
      exec: string[];
    };
  };
  created_at: string;
}

// Constants
const API_URL = 'https://api.machines.dev/v1';
const APP_NAME = 'lightfast-worker-instances';

// Create headers for API requests
const createHeaders = () => {
  // Extract the first token if multiple are provided (comma-separated)
  const token = config.flyApiToken.split(',')[0].trim();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

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

// Machine config type
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

// Create machine configuration
const createMachineConfig = (options: CreateInstanceOptions): MachineConfig => {
  const { name, region, image, size, memoryMb, metadata, repoUrl, secrets } = options;
  const cpuConfig = parseMachineSize(size || 'shared-cpu-1x');

  const machineConfig: MachineConfig = {
    name: name || `instance-${Date.now()}`,
    region: region || 'iad',
    config: {
      image: image || 'ubuntu:22.04',
      guest: {
        cpu_kind: cpuConfig.kind,
        cpus: cpuConfig.cpus,
        memory_mb: memoryMb || 512,
      },
      services: [],
      env: {
        ...metadata,
        DEBIAN_FRONTEND: 'noninteractive',
        TZ: 'UTC',
        // Add GitHub credentials directly as environment variables
        ...(secrets?.githubToken && {
          GITHUB_TOKEN: secrets.githubToken,
          GITHUB_USERNAME: secrets.githubUsername || 'x-access-token',
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
};

// Create a new Fly machine
export const createMachine = async (
  options: CreateInstanceOptions,
): Promise<Result<FlyMachine, InstanceCreationError | InfrastructureError>> => {
  const machineConfig = createMachineConfig(options);

  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(machineConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      log.error('Fly.io machine creation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        config: machineConfig,
      });

      // Also log to console for debugging
      console.error('Fly.io Error Details:', {
        status: response.status,
        error: errorText,
      });

      // Return user-friendly error based on status code
      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform'));
      }
      if (response.status === 422) {
        return err(new InstanceCreationError('invalid configuration'));
      }
      if (response.status === 429) {
        return err(new InstanceCreationError('rate limit exceeded'));
      }
      return err(new InstanceCreationError());
    }

    const machine = (await response.json()) as FlyMachine;
    log.info(`Created Fly machine: ${machine.id}`);

    // Wait for machine to be ready
    const readyResult = await waitForMachineReady(machine.id);
    if (readyResult.isErr()) {
      return err(readyResult.error);
    }

    return ok(machine);
  } catch (error) {
    // Log technical error with full details
    log.error('Unexpected error creating Fly machine:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      config: machineConfig,
    });

    return err(new InfrastructureError('compute platform'));
  }
};

// Get machine details
export const getMachine = async (
  machineId: string,
): Promise<Result<FlyMachine, InstanceOperationError | InfrastructureError>> => {
  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines/${machineId}`, {
      method: 'GET',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      log.error('Failed to get Fly machine:', {
        machineId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Return user-friendly error based on status code
      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform'));
      }
      if (response.status === 404) {
        return err(new InstanceOperationError('retrieve', 'instance not found'));
      }
      return err(new InstanceOperationError('retrieve'));
    }

    const machine = (await response.json()) as FlyMachine;
    return ok(machine);
  } catch (error) {
    // Log technical error with full details
    log.error('Unexpected error getting Fly machine:', {
      machineId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return err(new InfrastructureError('compute platform'));
  }
};

// List all machines
export const listMachines = async (): Promise<Result<FlyMachine[], InstanceOperationError | InfrastructureError>> => {
  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines`, {
      method: 'GET',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      log.error('Failed to list Fly machines:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Return user-friendly error based on status code
      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform'));
      }
      return err(new InstanceOperationError('list'));
    }

    const machines = (await response.json()) as FlyMachine[];
    return ok(machines);
  } catch (error) {
    // Log technical error with full details
    log.error('Unexpected error listing Fly machines:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return err(new InfrastructureError('compute platform'));
  }
};

// Destroy a machine
export const destroyMachine = async (
  machineId: string,
): Promise<Result<void, InstanceOperationError | InfrastructureError>> => {
  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines/${machineId}`, {
      method: 'DELETE',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      log.error('Failed to destroy Fly machine:', {
        machineId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Return user-friendly error based on status code
      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform'));
      }
      if (response.status === 404) {
        return err(new InstanceOperationError('destroy', 'instance not found'));
      }
      return err(new InstanceOperationError('destroy'));
    }

    log.info(`Destroyed Fly machine: ${machineId}`);
    return ok(undefined);
  } catch (error) {
    // Log technical error with full details
    log.error('Unexpected error destroying Fly machine:', {
      machineId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return err(new InfrastructureError('compute platform'));
  }
};

// Stop a machine
export const stopMachine = async (
  machineId: string,
): Promise<Result<void, InstanceOperationError | InfrastructureError>> => {
  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines/${machineId}/stop`, {
      method: 'POST',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      log.error('Failed to stop Fly machine:', {
        machineId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Return user-friendly error based on status code
      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform'));
      }
      if (response.status === 404) {
        return err(new InstanceOperationError('stop', 'instance not found'));
      }
      return err(new InstanceOperationError('stop'));
    }

    log.info(`Stopped Fly machine: ${machineId}`);
    return ok(undefined);
  } catch (error) {
    // Log technical error with full details
    log.error('Unexpected error stopping Fly machine:', {
      machineId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return err(new InfrastructureError('compute platform'));
  }
};

// Start a machine
export const startMachine = async (
  machineId: string,
): Promise<Result<void, InstanceOperationError | InfrastructureError>> => {
  try {
    const response = await fetch(`${API_URL}/apps/${APP_NAME}/machines/${machineId}/start`, {
      method: 'POST',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      log.error('Failed to start Fly machine:', {
        machineId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Return user-friendly error based on status code
      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform'));
      }
      if (response.status === 404) {
        return err(new InstanceOperationError('start', 'instance not found'));
      }
      return err(new InstanceOperationError('start'));
    }

    log.info(`Started Fly machine: ${machineId}`);

    const readyResult = await waitForMachineReady(machineId);
    if (readyResult.isErr()) {
      return err(readyResult.error);
    }

    return ok(undefined);
  } catch (error) {
    // Log technical error with full details
    log.error('Unexpected error starting Fly machine:', {
      machineId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return err(new InfrastructureError('compute platform'));
  }
};

// Wait for machine to be ready
export const waitForMachineReady = async (
  machineId: string,
  maxAttempts = 30,
): Promise<Result<void, InstanceOperationError | InfrastructureError>> => {
  log.info(`Waiting for machine ${machineId} to be ready...`);

  for (let i = 0; i < maxAttempts; i++) {
    const machineResult = await getMachine(machineId);

    if (machineResult.isErr()) {
      return err(machineResult.error);
    }

    const machine = machineResult.value;

    if (machine.state === 'started') {
      log.info(`Machine ${machineId} is ready`);
      return ok(undefined);
    }

    if (machine.state === 'failed' || machine.state === 'destroyed') {
      // Log technical details for debugging
      log.error('Machine failed to start:', {
        machineId,
        state: machine.state,
        attempt: i + 1,
        maxAttempts,
      });

      return err(new InstanceOperationError('start', `instance entered ${machine.state} state`));
    }

    log.debug(`Waiting for machine ${machineId}, current state: ${machine.state}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Log timeout details for debugging
  log.error('Machine failed to become ready in time:', {
    machineId,
    maxAttempts,
    timeoutSeconds: maxAttempts * 2,
  });

  return err(new InstanceOperationError('start', 'timeout waiting for instance to become ready'));
};

// Set app-level secrets
export const setAppSecrets = async (secrets: Record<string, string>): Promise<Result<void, InfrastructureError>> => {
  try {
    const secretsArray = Object.entries(secrets).map(([key, value]) => ({
      name: key,
      value: value,
    }));

    const response = await fetch(`${API_URL}/apps/${APP_NAME}/secrets`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify({ secrets: secretsArray }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      log.error('Failed to set app secrets:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return err(new InfrastructureError('Failed to set app secrets'));
    }

    log.info('App secrets updated successfully');
    return ok(undefined);
  } catch (error) {
    log.error('Unexpected error setting app secrets:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return err(new InfrastructureError('compute platform'));
  }
};
