import { spawn } from 'node:child_process';
import { err, ok, type Result } from 'neverthrow';
import pino from 'pino';
import { InfrastructureError, InstanceOperationError } from '@/lib/error-handler';
import { type CommandExecution, getStorage } from '@/lib/storage';

const log = pino();

// Types - CommandExecution is now imported from storage

interface ExecuteCommandOptions {
  instanceId: string;
  machineId: string;
  command: string;
  args: string[];
  timeout?: number;
  onData?: (data: string) => void;
  onError?: (error: string) => void;
}

interface ExecuteCommandResult {
  output: string;
  error: string;
  exitCode: number | null;
}

// Storage is now handled by the storage abstraction

// Execute command using Fly.io exec (if available) or via SSH proxy
export const executeCommand = async (
  options: ExecuteCommandOptions,
): Promise<Result<ExecuteCommandResult, InstanceOperationError | InfrastructureError>> => {
  const { instanceId, machineId, command, args, timeout, onData, onError } = options;
  const startTime = Date.now();

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

    // Record in history
    const execution: CommandExecution = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      instanceId,
      command,
      args,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      status: result.exitCode === 0 ? 'completed' : 'failed',
    };

    const storage = getStorage();
    await storage.saveCommandExecution(execution);

    return ok(result);
  } catch (error) {
    log.error('Failed to execute command:', {
      instanceId,
      machineId,
      command,
      args,
      error: error instanceof Error ? error.message : String(error),
    });

    // Record failed execution in history
    const execution: CommandExecution = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      instanceId,
      command,
      args,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      exitCode: null,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      status: 'failed',
    };

    const storage = getStorage();
    await storage.saveCommandExecution(execution);

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

// Get command history for an instance
export const getCommandHistory = async (instanceId: string): Promise<CommandExecution[]> => {
  const storage = getStorage();
  const historyResult = await storage.getCommandHistory(instanceId);

  if (historyResult.isErr()) {
    log.error('Failed to get command history:', historyResult.error);
    return [];
  }

  return historyResult.value;
};

// The addToHistory function is no longer needed - storage handles this

// Clear command history for an instance
export const clearCommandHistory = (instanceId: string): void => {
  const storage = getStorage();
  storage.clearCommandHistory(instanceId).catch((error) => {
    log.error('Failed to clear command history:', error);
  });
};

// Clear all command history (for testing)
export const clearAllCommandHistory = (): void => {
  const storage = getStorage();
  storage.clearAllCommandHistory().catch((error) => {
    log.error('Failed to clear all command history:', error);
  });
};
