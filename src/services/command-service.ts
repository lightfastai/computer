import { err, ok, type Result } from 'neverthrow';
import type { Logger } from 'pino';
import { InfrastructureError, InstanceOperationError } from '@/lib/error-handler';

// Constants
const API_URL = 'https://api.machines.dev/v1';

// Types
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

interface ExecuteCommandOptions {
  instanceId: string;
  machineId: string;
  command: string;
  args: string[];
  timeout?: number;
  onData?: (data: string) => void;
  onError?: (error: string) => void;
}

export interface ExecuteCommandResult {
  output: string;
  error: string;
  exitCode: number | null;
}

// Create headers for API requests
const createHeaders = (flyApiToken: string) => {
  const token = flyApiToken.trim();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Execute command using Fly.io REST API
export const executeCommand = async (
  options: ExecuteCommandOptions,
  flyApiToken: string,
  appName: string,
  logger: Logger,
): Promise<Result<ExecuteCommandResult, InstanceOperationError | InfrastructureError>> => {
  const { instanceId, machineId, command, args, timeout } = options;

  try {
    // Build the full command
    const fullCommand = [command, ...args].join(' ');

    // Prepare the request body
    // Note: The exact API format is not documented, so this is based on common patterns
    // This may need adjustment based on the actual API response
    const requestBody = {
      cmd: ['sh', '-c', fullCommand],
      timeout: timeout || 30000, // Default 30 seconds
    };

    // Make the API request
    const controller = new AbortController();
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

    const response = await fetch(`${API_URL}/apps/${appName}/machines/${machineId}/exec`, {
      method: 'POST',
      headers: createHeaders(flyApiToken),
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();

      logger.error('Failed to execute command via REST API:', {
        instanceId,
        machineId,
        command,
        args,
        status: response.status,
        error: errorText,
      });

      // Handle specific error cases with technical details
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        machineId,
        instanceId,
        command,
        args,
        appName,
      };

      if (response.status === 404) {
        return err(new InstanceOperationError('execute', 'Machine not found', errorDetails));
      }
      if (response.status >= 500) {
        return err(new InfrastructureError('compute platform', errorDetails));
      }
      if (response.status === 401 || response.status === 403) {
        return err(new InstanceOperationError('execute', 'Authentication failed', errorDetails));
      }

      return err(new InstanceOperationError('execute', 'Command execution failed', errorDetails));
    }

    // Parse the response
    // The response format is unknown, but likely contains:
    // - stdout: string
    // - stderr: string
    // - exit_code: number
    const result = (await response.json()) as {
      stdout?: string;
      stderr?: string;
      exit_code?: number;
      // Alternative field names
      output?: string;
      error?: string;
      exitCode?: number;
    };

    // Normalize the response to our expected format
    const commandResult: ExecuteCommandResult = {
      output: result.stdout || result.output || '',
      error: result.stderr || result.error || '',
      exitCode: result.exit_code ?? result.exitCode ?? null,
    };

    // Call callbacks if provided (for compatibility)
    if (options.onData && commandResult.output) {
      options.onData(commandResult.output);
    }
    if (options.onError && commandResult.error) {
      options.onError(commandResult.error);
    }

    return ok(commandResult);
  } catch (error) {
    logger.error('Failed to execute command:', {
      instanceId,
      machineId,
      command,
      args,
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      return err(
        new InstanceOperationError('execute', `Command timed out after ${timeout}ms`, {
          timeout,
          machineId,
          instanceId,
          command,
          args,
        }),
      );
    }

    return err(
      new InstanceOperationError('execute', 'Command execution failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        machineId,
        instanceId,
        command,
        args,
      }),
    );
  }
};
