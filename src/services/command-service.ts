import { err, ok, type Result } from 'neverthrow';
import { InfrastructureError, type InstanceOperationError } from '@/lib/error-handler';
import type { ComputeProvider } from '@/types/provider';

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

// Execute command using provider abstraction
export const executeCommand = async (
  options: ExecuteCommandOptions,
  provider: ComputeProvider,
): Promise<Result<ExecuteCommandResult, InstanceOperationError | InfrastructureError>> => {
  const { machineId, command, args, timeout, onData, onError } = options;

  try {
    // Build the full command
    const fullCommand = [command, ...args].join(' ');

    // Execute via provider
    const result = await provider.executeCommand(machineId, {
      command: fullCommand,
      timeout: timeout || 30000,
    });

    if (result.isErr()) {
      return err(result.error);
    }

    const commandResult = result.value;

    // Call callbacks if provided
    if (onData && commandResult.stdout) {
      onData(commandResult.stdout);
    }
    if (onError && commandResult.stderr) {
      onError(commandResult.stderr);
    }

    return ok({
      output: commandResult.stdout,
      error: commandResult.stderr,
      exitCode: commandResult.exitCode,
    });
  } catch (error) {
    return err(
      new InfrastructureError('compute platform', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        machineId,
        command,
        args,
      }),
    );
  }
};
