import { spawn } from 'node:child_process';
import { err, ok, type Result } from 'neverthrow';
import pino from 'pino';
import { InfrastructureError, InstanceOperationError } from '@/lib/error-handler';

const log = pino();

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

// Execute command using Fly.io exec (if available) or via SSH proxy
export const executeCommand = async (
  options: ExecuteCommandOptions,
): Promise<Result<ExecuteCommandResult, InstanceOperationError | InfrastructureError>> => {
  const { instanceId, machineId, command, args, timeout, onData, onError } = options;

  try {
    // For now, we'll use the Fly.io CLI as a proxy since the REST API exec endpoint
    // is not well documented. In production, this should use the REST API directly.

    // Build the command
    const fullCommand = [command, ...args].join(' ');

    // Use flyctl machine exec with proper argument format
    const flyctl = spawn('fly', [
      'machine',
      'exec',
      machineId,
      '-a',
      'lightfast-worker-instances',
      `sh -c "${fullCommand}"`,
    ]);

    let output = '';
    let error = '';
    let exitCode: number | null = null;

    // Handle stdout
    flyctl.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      if (onData) {
        onData(chunk);
      }
    });

    // Handle stderr
    flyctl.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      error += chunk;
      if (onError) {
        onError(chunk);
      }
    });

    // Handle completion
    const resultPromise = new Promise<ExecuteCommandResult>((resolve, reject) => {
      flyctl.on('close', (code) => {
        exitCode = code;
        resolve({ output, error, exitCode });
      });

      flyctl.on('error', (err) => {
        reject(err);
      });
    });

    // Apply timeout if specified
    let timeoutHandle: NodeJS.Timeout | null = null;
    if (timeout) {
      timeoutHandle = setTimeout(() => {
        flyctl.kill();
        error += `\nCommand timed out after ${timeout}ms`;
      }, timeout);
    }

    // Wait for completion
    const result = await resultPromise;

    // Clear timeout if it was set
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    // Return result directly - no storage in stateless SDK
    return ok(result);
  } catch (error) {
    log.error('Failed to execute command:', {
      instanceId,
      machineId,
      command,
      args,
      error: error instanceof Error ? error.message : String(error),
    });

    return err(new InstanceOperationError('execute', 'Command execution failed'));
  }
};

// Alternative: Execute command via HTTP endpoint on the instance
// This would require the instance to run a command server
export const executeCommandViaHTTP = async (
  instancePrivateIP: string,
  command: string,
  args: string[],
): Promise<Result<ExecuteCommandResult, InstanceOperationError | InfrastructureError>> => {
  try {
    // This assumes the instance is running a command server on port 8080
    const response = await fetch(`http://[${instancePrivateIP}]:8080/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${'dev-token'}`,
      },
      body: JSON.stringify({ command, args }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      return err(new InstanceOperationError('execute', `HTTP ${response.status}`));
    }

    const result = await response.json();
    return ok(result as ExecuteCommandResult);
  } catch (error) {
    log.error('Failed to execute command via HTTP:', {
      instancePrivateIP,
      command,
      args,
      error: error instanceof Error ? error.message : String(error),
    });

    return err(new InfrastructureError('Command execution via HTTP failed'));
  }
};

// Get command history for an instance - no longer supported in stateless SDK
export const getCommandHistory = async (_instanceId: string): Promise<CommandExecution[]> => {
  // Stateless SDK doesn't maintain command history
  return [];
};

// Clear command history for an instance - no-op in stateless SDK
export const clearCommandHistory = (_instanceId: string): void => {
  // No-op - stateless SDK doesn't maintain history
};

// Clear all command history (for testing) - no-op in stateless SDK
export const clearAllCommandHistory = (): void => {
  // No-op - stateless SDK doesn't maintain history
};
