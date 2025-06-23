import { err, ok, type Result } from 'neverthrow';
import type { Logger } from 'pino';
import { InfrastructureError, InstanceCreationError, InstanceOperationError } from '@/lib/error-handler';
import type { CreateInstanceOptions } from '@/types/index';

// Constants
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

// Create headers for API requests
const createHeaders = (flyApiToken: string) => {
  // Use the full token string - Fly.io API requires all comma-separated tokens
  const token = flyApiToken.trim();
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
      image: image || 'docker.io/library/ubuntu:22.04',
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
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<FlyMachine, InstanceCreationError | InfrastructureError>> => {
  const machineConfig = createMachineConfig(options);

  try {
    const response = await fetch(`${API_URL}/apps/${appName}/machines`, {
      method: 'POST',
      headers: createHeaders(flyApiToken),
      body: JSON.stringify(machineConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      logger.error('Fly.io machine creation failed:', {
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

      // Return user-friendly error based on status code with technical details
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        appName,
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

    const machine = (await response.json()) as FlyMachine;
    logger.info(`Created Fly machine: ${machine.id}`);

    // Wait for machine to be ready
    const readyResult = await waitForMachineReady(machine.id, flyApiToken, appName, logger);
    if (readyResult.isErr()) {
      return err(readyResult.error);
    }

    return ok(machine);
  } catch (error) {
    // Log technical error with full details
    logger.error('Unexpected error creating Fly machine:', {
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
};

// Get machine details
export const getMachine = async (
  machineId: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<FlyMachine, InstanceOperationError | InfrastructureError>> => {
  try {
    const response = await fetch(`${API_URL}/apps/${appName}/machines/${machineId}`, {
      method: 'GET',
      headers: createHeaders(flyApiToken),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      logger.error('Failed to get Fly machine:', {
        machineId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Return user-friendly error based on status code with technical details
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        machineId,
        appName,
      };

      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform', errorDetails));
      }
      if (response.status === 404) {
        return err(new InstanceOperationError('retrieve', 'instance not found', errorDetails));
      }
      return err(new InstanceOperationError('retrieve', undefined, errorDetails));
    }

    const machine = (await response.json()) as FlyMachine;
    return ok(machine);
  } catch (error) {
    // Log technical error with full details
    logger.error('Unexpected error getting Fly machine:', {
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
};

// List all machines
export const listMachines = async (
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<FlyMachine[], InstanceOperationError | InfrastructureError>> => {
  try {
    const response = await fetch(`${API_URL}/apps/${appName}/machines`, {
      method: 'GET',
      headers: createHeaders(flyApiToken),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      logger.error('Failed to list Fly machines:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Return user-friendly error based on status code with technical details
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        appName,
      };

      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform', errorDetails));
      }
      return err(new InstanceOperationError('list', undefined, errorDetails));
    }

    const machines = (await response.json()) as FlyMachine[];
    return ok(machines);
  } catch (error) {
    // Log technical error with full details
    logger.error('Unexpected error listing Fly machines:', {
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
};

// Destroy a machine
export const destroyMachine = async (
  machineId: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<void, InstanceOperationError | InfrastructureError>> => {
  try {
    const response = await fetch(`${API_URL}/apps/${appName}/machines/${machineId}`, {
      method: 'DELETE',
      headers: createHeaders(flyApiToken),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      logger.error('Failed to destroy Fly machine:', {
        machineId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Return user-friendly error based on status code with technical details
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        machineId,
        appName,
      };

      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform', errorDetails));
      }
      if (response.status === 404) {
        return err(new InstanceOperationError('destroy', 'instance not found', errorDetails));
      }
      return err(new InstanceOperationError('destroy', undefined, errorDetails));
    }

    logger.info(`Destroyed Fly machine: ${machineId}`);
    return ok(undefined);
  } catch (error) {
    // Log technical error with full details
    logger.error('Unexpected error destroying Fly machine:', {
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
};

// Stop a machine
export const stopMachine = async (
  machineId: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<void, InstanceOperationError | InfrastructureError>> => {
  try {
    const response = await fetch(`${API_URL}/apps/${appName}/machines/${machineId}/stop`, {
      method: 'POST',
      headers: createHeaders(flyApiToken),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      logger.error('Failed to stop Fly machine:', {
        machineId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Return user-friendly error based on status code with technical details
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        machineId,
        appName,
      };

      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform', errorDetails));
      }
      if (response.status === 404) {
        return err(new InstanceOperationError('stop', 'instance not found', errorDetails));
      }
      return err(new InstanceOperationError('stop', undefined, errorDetails));
    }

    logger.info(`Stopped Fly machine: ${machineId}`);
    return ok(undefined);
  } catch (error) {
    // Log technical error with full details
    logger.error('Unexpected error stopping Fly machine:', {
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
};

// Start a machine
export const startMachine = async (
  machineId: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<void, InstanceOperationError | InfrastructureError>> => {
  try {
    const response = await fetch(`${API_URL}/apps/${appName}/machines/${machineId}/start`, {
      method: 'POST',
      headers: createHeaders(flyApiToken),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log technical details for debugging
      logger.error('Failed to start Fly machine:', {
        machineId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Return user-friendly error based on status code with technical details
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        machineId,
        appName,
      };

      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform', errorDetails));
      }
      if (response.status === 404) {
        return err(new InstanceOperationError('start', 'instance not found', errorDetails));
      }
      return err(new InstanceOperationError('start', undefined, errorDetails));
    }

    logger.info(`Started Fly machine: ${machineId}`);

    const readyResult = await waitForMachineReady(machineId, flyApiToken, appName, logger);
    if (readyResult.isErr()) {
      return err(readyResult.error);
    }

    return ok(undefined);
  } catch (error) {
    // Log technical error with full details
    logger.error('Unexpected error starting Fly machine:', {
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
};

// Wait for machine to be ready
export const waitForMachineReady = async (
  machineId: string,
  flyApiToken: string,
  appName: string,
  logger: Logger,
  maxAttempts = 30,
): Promise<Result<void, InstanceOperationError | InfrastructureError>> => {
  logger.info(`Waiting for machine ${machineId} to be ready...`);

  for (let i = 0; i < maxAttempts; i++) {
    const machineResult = await getMachine(machineId, flyApiToken, appName, logger);

    if (machineResult.isErr()) {
      return err(machineResult.error);
    }

    const machine = machineResult.value;

    if (machine.state === 'started') {
      logger.info(`Machine ${machineId} is ready`);
      return ok(undefined);
    }

    if (machine.state === 'failed' || machine.state === 'destroyed') {
      // Log technical details for debugging
      logger.error('Machine failed to start:', {
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

    logger.debug(`Waiting for machine ${machineId}, current state: ${machine.state}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Log timeout details for debugging
  logger.error('Machine failed to become ready in time:', {
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
};

// Set app-level secrets
export const setAppSecrets = async (
  secrets: Record<string, string>,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<void, InfrastructureError>> => {
  try {
    const secretsArray = Object.entries(secrets).map(([key, value]) => ({
      name: key,
      value: value,
    }));

    const response = await fetch(`${API_URL}/apps/${appName}/secrets`, {
      method: 'PUT',
      headers: createHeaders(flyApiToken),
      body: JSON.stringify({ secrets: secretsArray }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      logger.error('Failed to set app secrets:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return err(
        new InfrastructureError('Failed to set app secrets', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          appName,
        }),
      );
    }

    logger.info('App secrets updated successfully');
    return ok(undefined);
  } catch (error) {
    logger.error('Unexpected error setting app secrets:', {
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
};
