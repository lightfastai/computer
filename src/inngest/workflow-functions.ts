import { inngest } from '@/lib/inngest';
import { instanceService, workflowService } from '@/services/index';
import { StepType, WorkflowStatus, type WorkflowStep } from '@/types/index';
import pino from 'pino';

const log = pino();

// Execute workflow with step-by-step reliability
export const executeWorkflow = inngest.createFunction(
  {
    id: 'execute-workflow',
    retries: 3,
    throttle: {
      limit: 5,
      period: '60s',
    },
  },
  { event: 'workflow/execute' },
  async ({ event, step }) => {
    const { workflowId, executionId, context } = event.data;

    // Get workflow definition
    const workflow = await step.run('get-workflow', async () => {
      return await workflowService.getWorkflow(workflowId);
    });

    log.info(`Executing workflow ${workflowId} with ${workflow.steps.length} steps`);

    // Update execution status to running
    await step.run('update-status-running', async () => {
      const execution = await workflowService.getExecution(executionId);
      execution.status = WorkflowStatus.RUNNING;
      // TODO: Implement execution update method
    });

    // Execute each workflow step
    const results: Record<string, any> = {};

    for (let i = 0; i < workflow.steps.length; i++) {
      const workflowStep = workflow.steps[i];

      // Check dependencies
      const canExecute = await step.run(`check-deps-${workflowStep.id}`, async () => {
        if (!workflowStep.dependsOn || workflowStep.dependsOn.length === 0) {
          return true;
        }

        return workflowStep.dependsOn.every((depId) => results[depId] !== undefined);
      });

      if (!canExecute) {
        throw new Error(`Dependencies not met for step ${workflowStep.id}`);
      }

      // Execute the step with retries
      const stepResult = await step.run(`execute-step-${workflowStep.id}`, async () => {
        log.info(`Executing workflow step: ${workflowStep.name} (${workflowStep.type})`);

        try {
          switch (workflowStep.type) {
            case StepType.CREATE_INSTANCE:
              return await executeCreateInstanceStep(workflowStep, context);

            case StepType.EXECUTE_COMMAND:
              return await executeCommandStep(workflowStep, context);

            case StepType.WAIT:
              return await executeWaitStep(workflowStep);

            case StepType.DESTROY_INSTANCE:
              return await executeDestroyInstanceStep(workflowStep, context);

            default:
              throw new Error(`Unknown step type: ${workflowStep.type}`);
          }
        } catch (error) {
          log.error(`Step ${workflowStep.id} failed:`, error);
          throw error;
        }
      });

      results[workflowStep.id] = stepResult;

      // Update context with step results
      if (stepResult && typeof stepResult === 'object') {
        Object.assign(context, stepResult);
      }
    }

    // Update execution status to completed
    await step.run('update-status-completed', async () => {
      const execution = await workflowService.getExecution(executionId);
      execution.status = WorkflowStatus.COMPLETED;
      execution.completedAt = new Date();
      // TODO: Implement execution update method
    });

    return {
      workflowId,
      executionId,
      status: 'completed',
      results,
    };
  },
);

// Helper functions for step execution
async function executeCreateInstanceStep(step: WorkflowStep, context: Record<string, any>): Promise<any> {
  const instance = await instanceService.createInstance(step.config);

  // Store instance ID in context
  const contextKey = step.config.contextKey || 'instanceId';
  context[contextKey] = instance.id;

  return { instanceId: instance.id };
}

async function executeCommandStep(step: WorkflowStep, context: Record<string, any>): Promise<any> {
  const instanceId = context[step.config.instanceKey || 'instanceId'];

  if (!instanceId) {
    throw new Error('No instance ID found in context');
  }

  const result = await instanceService.executeCommand(instanceId, step.config.command, {
    timeout: step.config.timeout,
  });

  return {
    output: result.output,
    error: result.error,
    exitCode: result.exitCode,
  };
}

async function executeWaitStep(step: WorkflowStep): Promise<any> {
  const duration = step.config.duration || 1000;
  await new Promise((resolve) => setTimeout(resolve, duration));
  return { waited: duration };
}

async function executeDestroyInstanceStep(step: WorkflowStep, context: Record<string, any>): Promise<any> {
  const instanceId = context[step.config.instanceKey || 'instanceId'];

  if (!instanceId) {
    throw new Error('No instance ID found in context');
  }

  await instanceService.destroyInstance(instanceId);

  // Remove instance ID from context
  delete context[step.config.instanceKey || 'instanceId'];

  return { destroyed: true };
}
