import { NotFoundError } from '@/lib/error-handler';
import * as instanceService from '@/services/instance-service';
import { StepType, type Workflow, type WorkflowExecution, WorkflowStatus, type WorkflowStep } from '@/types/index';
import { nanoid } from 'nanoid';
import pino from 'pino';

const log = pino();

// State stores
const workflows = new Map<string, Workflow>();
const executions = new Map<string, WorkflowExecution>();

// Clear all workflows (for testing)
export const clearAllWorkflows = (): void => {
  workflows.clear();
  executions.clear();
};

// Initialize default workflows
export const initializeDefaultWorkflows = (): void => {
  // Git Clone and Push workflow template
  const gitWorkflow: Workflow = {
    id: nanoid(),
    name: 'Git Clone and Push',
    description: 'Clone a git repository, make changes, and push back',
    steps: [
      {
        id: 'create-instance',
        name: 'Create Ubuntu instance',
        type: StepType.CREATE_INSTANCE,
        config: {
          size: 'shared-cpu-1x',
          memoryMb: 1024,
        },
      },
      {
        id: 'install-git',
        name: 'Install git',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'apt-get update && apt-get install -y git',
          instanceKey: 'instanceId',
        },
        dependsOn: ['create-instance'],
      },
      {
        id: 'configure-git',
        name: 'Configure git',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'git config --global user.email "bot@example.com" && git config --global user.name "Bot"',
          instanceKey: 'instanceId',
        },
        dependsOn: ['install-git'],
      },
      {
        id: 'clone-repo',
        name: 'Clone repository',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'git clone {{repoUrl}} /tmp/repo',
          instanceKey: 'instanceId',
        },
        dependsOn: ['configure-git'],
      },
      {
        id: 'make-changes',
        name: 'Make changes',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'cd /tmp/repo && echo "{{content}}" >> README.md',
          instanceKey: 'instanceId',
        },
        dependsOn: ['clone-repo'],
      },
      {
        id: 'commit-changes',
        name: 'Commit changes',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'cd /tmp/repo && git add . && git commit -m "{{commitMessage}}"',
          instanceKey: 'instanceId',
        },
        dependsOn: ['make-changes'],
      },
      {
        id: 'push-changes',
        name: 'Push changes',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'cd /tmp/repo && git push origin main',
          instanceKey: 'instanceId',
        },
        dependsOn: ['commit-changes'],
      },
      {
        id: 'cleanup',
        name: 'Destroy instance',
        type: StepType.DESTROY_INSTANCE,
        config: {
          instanceKey: 'instanceId',
        },
        dependsOn: ['push-changes'],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  workflows.set(gitWorkflow.id, gitWorkflow);
  log.info(`Workflow ${gitWorkflow.id} created: ${gitWorkflow.name}`);

  // Development Environment Setup workflow template
  const devSetupWorkflow: Workflow = {
    id: nanoid(),
    name: 'Development Environment Setup',
    description: 'Set up a development environment with common tools',
    steps: [
      {
        id: 'create-instance',
        name: 'Create Ubuntu instance',
        type: StepType.CREATE_INSTANCE,
        config: {
          size: 'shared-cpu-2x',
          memoryMb: 2048,
        },
      },
      {
        id: 'update-system',
        name: 'Update system packages',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'apt-get update && apt-get upgrade -y',
          instanceKey: 'instanceId',
          timeout: 300000, // 5 minutes
        },
        dependsOn: ['create-instance'],
      },
      {
        id: 'install-basics',
        name: 'Install basic tools',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'apt-get install -y curl wget git vim build-essential',
          instanceKey: 'instanceId',
        },
        dependsOn: ['update-system'],
      },
      {
        id: 'install-nodejs',
        name: 'Install Node.js',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && apt-get install -y nodejs',
          instanceKey: 'instanceId',
        },
        dependsOn: ['install-basics'],
      },
      {
        id: 'install-docker',
        name: 'Install Docker',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'curl -fsSL https://get.docker.com | sh',
          instanceKey: 'instanceId',
        },
        dependsOn: ['install-basics'],
      },
      {
        id: 'verify-setup',
        name: 'Verify installation',
        type: StepType.EXECUTE_COMMAND,
        config: {
          command: 'node --version && npm --version && docker --version',
          instanceKey: 'instanceId',
        },
        dependsOn: ['install-nodejs', 'install-docker'],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  workflows.set(devSetupWorkflow.id, devSetupWorkflow);
  log.info(`Workflow ${devSetupWorkflow.id} created: ${devSetupWorkflow.name}`);
};

// Create a new workflow
export const createWorkflow = async (
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Workflow> => {
  const workflowId = nanoid();

  const newWorkflow: Workflow = {
    id: workflowId,
    ...workflow,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  workflows.set(workflowId, newWorkflow);

  log.info(`Workflow ${workflowId} created: ${workflow.name}`);
  return newWorkflow;
};

// Get a workflow by ID
export const getWorkflow = async (workflowId: string): Promise<Workflow> => {
  const workflow = workflows.get(workflowId);

  if (!workflow) {
    throw new NotFoundError('Workflow', workflowId);
  }

  return workflow;
};

// List all workflows
export const listWorkflows = async (): Promise<Workflow[]> => {
  return Array.from(workflows.values());
};

// Execute a workflow
export const executeWorkflow = async (
  workflowId: string,
  context: Record<string, any> = {}
): Promise<WorkflowExecution> => {
  const workflow = await getWorkflow(workflowId);
  const executionId = nanoid();

  const execution: WorkflowExecution = {
    id: executionId,
    workflowId,
    status: WorkflowStatus.PENDING,
    context,
    startedAt: new Date(),
  };

  executions.set(executionId, execution);

  log.info(`Starting workflow execution ${executionId} for workflow ${workflowId}`);

  // Run workflow asynchronously
  runWorkflow(execution, workflow).catch((error) => {
    log.error(`Workflow execution ${executionId} failed:`, error);
  });

  return execution;
};

// Get an execution by ID
export const getExecution = async (executionId: string): Promise<WorkflowExecution> => {
  const execution = executions.get(executionId);

  if (!execution) {
    throw new NotFoundError('WorkflowExecution', executionId);
  }

  return execution;
};

// List workflow executions
export const listExecutions = async (workflowId?: string): Promise<WorkflowExecution[]> => {
  const executionArray = Array.from(executions.values());

  if (workflowId) {
    return executionArray.filter((exec) => exec.workflowId === workflowId);
  }

  return executionArray;
};

// Run workflow asynchronously
const runWorkflow = async (execution: WorkflowExecution, workflow: Workflow): Promise<void> => {
  execution.status = WorkflowStatus.RUNNING;
  executions.set(execution.id, execution);

  try {
    // Execute steps in order (respecting dependencies)
    const executedSteps = new Set<string>();

    while (executedSteps.size < workflow.steps.length) {
      const readySteps = workflow.steps.filter((step) => {
        // Check if all dependencies are executed
        if (!step.dependsOn || step.dependsOn.length === 0) {
          return !executedSteps.has(step.id);
        }

        return step.dependsOn.every((depId) => executedSteps.has(depId)) && !executedSteps.has(step.id);
      });

      if (readySteps.length === 0) {
        throw new Error('Circular dependency detected in workflow');
      }

      // Execute ready steps in parallel
      await Promise.all(readySteps.map((step) => executeStep(step, execution.context)));

      for (const step of readySteps) {
        executedSteps.add(step.id);
      }
    }

    execution.status = WorkflowStatus.COMPLETED;
    execution.completedAt = new Date();
  } catch (error) {
    execution.status = WorkflowStatus.FAILED;
    execution.error = error.message;
    execution.completedAt = new Date();
  }

  executions.set(execution.id, execution);
};

// Execute a single workflow step
const executeStep = async (step: WorkflowStep, context: Record<string, any>): Promise<void> => {
  log.info(`Executing workflow step: ${step.name} (${step.type})`);

  switch (step.type) {
    case StepType.CREATE_INSTANCE:
      await executeCreateInstanceStep(step, context);
      break;

    case StepType.EXECUTE_COMMAND:
      await executeCommandStep(step, context);
      break;

    case StepType.WAIT:
      await executeWaitStep(step, context);
      break;

    case StepType.DESTROY_INSTANCE:
      await executeDestroyInstanceStep(step, context);
      break;

    case StepType.CONDITIONAL:
      await executeConditionalStep(step, context);
      break;

    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
};

// Step execution functions
const executeCreateInstanceStep = async (step: WorkflowStep, context: Record<string, any>): Promise<void> => {
  const instance = await instanceService.createInstance(step.config);

  // Store instance ID in context
  const contextKey = step.config.contextKey || 'instanceId';
  context[contextKey] = instance.id;

  log.info(`Instance created: ${instance.id}`);
};

const executeCommandStep = async (step: WorkflowStep, context: Record<string, any>): Promise<void> => {
  const instanceId = context[step.config.instanceKey || 'instanceId'];

  if (!instanceId) {
    throw new Error('No instance ID found in context');
  }

  const result = await instanceService.executeCommand(instanceId, step.config.command, {
    timeout: step.config.timeout,
  });

  // Store command result in context
  if (step.config.resultKey) {
    context[step.config.resultKey] = {
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
    };
  }

  // Check exit code if required
  if (step.config.failOnError && result.exitCode !== 0) {
    throw new Error(`Command failed with exit code ${result.exitCode}: ${result.error}`);
  }
};

const executeWaitStep = async (step: WorkflowStep, context: Record<string, any>): Promise<void> => {
  const duration = step.config.duration || 1000;
  await new Promise((resolve) => setTimeout(resolve, duration));
};

const executeDestroyInstanceStep = async (step: WorkflowStep, context: Record<string, any>): Promise<void> => {
  const instanceId = context[step.config.instanceKey || 'instanceId'];

  if (!instanceId) {
    throw new Error('No instance ID found in context');
  }

  await instanceService.destroyInstance(instanceId);

  // Remove instance ID from context
  delete context[step.config.instanceKey || 'instanceId'];
};

const executeConditionalStep = async (step: WorkflowStep, context: Record<string, any>): Promise<void> => {
  const condition = step.config.condition;
  const contextValue = context[step.config.contextKey];

  let shouldExecute = false;

  switch (condition.operator) {
    case 'equals':
      shouldExecute = contextValue === condition.value;
      break;
    case 'notEquals':
      shouldExecute = contextValue !== condition.value;
      break;
    case 'contains':
      shouldExecute = String(contextValue).includes(condition.value);
      break;
    case 'exists':
      shouldExecute = contextValue !== undefined && contextValue !== null;
      break;
    default:
      throw new Error(`Unknown condition operator: ${condition.operator}`);
  }

  if (!shouldExecute) {
    throw new Error(`Condition not met: ${JSON.stringify(condition)}`);
  }
};