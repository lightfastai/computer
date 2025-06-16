import { inngest } from '@/lib/inngest';
import { instanceService } from '@/services/index';
import { CommandStatus } from '@/types/index';
import pino from 'pino';

const log = pino();

// Execute command with timeout and retry logic
export const executeCommand = inngest.createFunction(
  {
    id: 'execute-command',
    retries: 2,
    throttle: {
      limit: 20,
      period: '60s',
    },
  },
  { event: 'command/execute' },
  async ({ event, step }) => {
    const { instanceId, command, timeout, executionId } = event.data;

    // Step 1: Verify instance is running
    const instance = await step.run('verify-instance', async () => {
      const inst = await instanceService.getInstance(instanceId);

      if (inst.status !== 'running') {
        throw new Error(`Instance ${instanceId} is not running: ${inst.status}`);
      }

      return inst;
    });

    // Step 2: Execute the command
    const result = await step.run('execute-command', async () => {
      log.info(`Executing command on instance ${instanceId}: ${command}`);

      try {
        const execution = await instanceService.executeCommand(instanceId, command, { timeout: timeout || 30000 });

        return {
          executionId: execution.id,
          output: execution.output,
          error: execution.error,
          exitCode: execution.exitCode,
          status: execution.status,
        };
      } catch (error) {
        log.error(`Command execution failed on instance ${instanceId}:`, error);

        // Check if it's a timeout
        if (error.message.includes('timeout')) {
          throw new Error(`Command timed out after ${timeout}ms`);
        }

        throw error;
      }
    });

    // Step 3: Handle command failure
    if (result.exitCode !== 0) {
      await step.run('handle-failure', async () => {
        log.warn(`Command failed with exit code ${result.exitCode}: ${result.error}`);

        // TODO: Send alerts, clean up, etc.
      });
    }

    return result;
  },
);

// Long-running command with progress updates
export const executeLongCommand = inngest.createFunction(
  {
    id: 'execute-long-command',
    retries: 1,
    throttle: {
      limit: 5,
      period: '60s',
    },
  },
  { event: 'command/execute' },
  async ({ event, step }) => {
    const { instanceId, command, timeout = 300000 } = event.data; // 5 min default

    // Execute in chunks with progress updates
    const checkInterval = 10000; // Check every 10 seconds
    const maxChecks = Math.floor(timeout / checkInterval);

    let executionId: string;

    // Start the command
    executionId = await step.run('start-command', async () => {
      log.info(`Starting long-running command on instance ${instanceId}: ${command}`);

      // TODO: Implement async command execution
      // For now, we'll use the sync version
      const execution = await instanceService.executeCommand(instanceId, command, { timeout });

      return execution.id;
    });

    // Check progress periodically
    for (let i = 0; i < maxChecks; i++) {
      await step.sleep(`check-${i}`, `${checkInterval}ms`);

      const status = await step.run(`check-status-${i}`, async () => {
        const execution = await instanceService.getCommandExecution(executionId);

        if (execution.status === CommandStatus.COMPLETED || execution.status === CommandStatus.FAILED) {
          return {
            completed: true,
            execution,
          };
        }

        return {
          completed: false,
          progress: `Check ${i + 1}/${maxChecks}`,
        };
      });

      if (status.completed) {
        return status.execution;
      }
    }

    // Timeout reached
    throw new Error(`Command timed out after ${timeout}ms`);
  },
);
