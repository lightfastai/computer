import { nanoid } from 'nanoid';
import pino from 'pino';
import { InstanceService } from './instance-service';
import {
  Workflow,
  WorkflowStep,
  WorkflowExecution,
  WorkflowStatus,
  StepType,
} from '../types';
import { NotFoundError } from '../lib/error-handler';

const log = pino();

export class WorkflowService {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  constructor(private instanceService: InstanceService) {
    // Load default workflow templates
    this.loadDefaultWorkflows();
  }

  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const workflowId = nanoid();

    const newWorkflow: Workflow = {
      id: workflowId,
      ...workflow,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(workflowId, newWorkflow);

    log.info(`Workflow ${workflowId} created: ${workflow.name}`);
    return newWorkflow;
  }

  async getWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      throw new NotFoundError('Workflow', workflowId);
    }

    return workflow;
  }

  async listWorkflows(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async executeWorkflow(
    workflowId: string,
    context: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflow(workflowId);
    const executionId = nanoid();

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: WorkflowStatus.PENDING,
      context,
      startedAt: new Date(),
    };

    this.executions.set(executionId, execution);

    // Use Inngest for reliable workflow execution
    if (process.env.INNGEST_ENABLED === 'true') {
      try {
        // Import dynamically to avoid circular dependency
        const { inngest } = await import('../lib/inngest');

        await inngest.send({
          name: 'workflow/execute',
          data: {
            workflowId,
            executionId,
            context,
          },
        });

        log.info(`Workflow ${workflowId} execution ${executionId} sent to Inngest`);
      } catch (error) {
        log.error('Failed to send workflow to Inngest:', error);
        // Fall back to local execution
        this.runWorkflow(execution, workflow).catch((error) => {
          log.error(`Workflow execution ${executionId} failed:`, error);
        });
      }
    } else {
      // Execute workflow locally
      this.runWorkflow(execution, workflow).catch((error) => {
        log.error(`Workflow execution ${executionId} failed:`, error);
      });
    }

    return execution;
  }

  async getExecution(executionId: string): Promise<WorkflowExecution> {
    const execution = this.executions.get(executionId);

    if (!execution) {
      throw new NotFoundError('WorkflowExecution', executionId);
    }

    return execution;
  }

  async listExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    const executions = Array.from(this.executions.values());

    if (workflowId) {
      return executions.filter(exec => exec.workflowId === workflowId);
    }

    return executions;
  }

  private async runWorkflow(
    execution: WorkflowExecution,
    workflow: Workflow
  ): Promise<void> {
    execution.status = WorkflowStatus.RUNNING;
    this.executions.set(execution.id, execution);

    try {
      // Execute steps in order (respecting dependencies)
      const executedSteps = new Set<string>();

      while (executedSteps.size < workflow.steps.length) {
        const readySteps = workflow.steps.filter(step => {
          // Check if all dependencies are executed
          if (!step.dependsOn || step.dependsOn.length === 0) {
            return !executedSteps.has(step.id);
          }

          return step.dependsOn.every(depId => executedSteps.has(depId)) &&
                 !executedSteps.has(step.id);
        });

        if (readySteps.length === 0) {
          throw new Error('Circular dependency detected in workflow');
        }

        // Execute ready steps in parallel
        await Promise.all(
          readySteps.map(step => this.executeStep(step, execution.context))
        );

        readySteps.forEach(step => executedSteps.add(step.id));
      }

      execution.status = WorkflowStatus.COMPLETED;
      execution.completedAt = new Date();
    } catch (error) {
      execution.status = WorkflowStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();
    }

    this.executions.set(execution.id, execution);
  }

  private async executeStep(
    step: WorkflowStep,
    context: Record<string, any>
  ): Promise<void> {
    log.info(`Executing workflow step: ${step.name} (${step.type})`);

    switch (step.type) {
      case StepType.CREATE_INSTANCE:
        await this.executeCreateInstanceStep(step, context);
        break;

      case StepType.EXECUTE_COMMAND:
        await this.executeCommandStep(step, context);
        break;

      case StepType.WAIT:
        await this.executeWaitStep(step, context);
        break;

      case StepType.DESTROY_INSTANCE:
        await this.executeDestroyInstanceStep(step, context);
        break;

      case StepType.CONDITIONAL:
        await this.executeConditionalStep(step, context);
        break;

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeCreateInstanceStep(
    step: WorkflowStep,
    context: Record<string, any>
  ): Promise<void> {
    const instance = await this.instanceService.createInstance(step.config);

    // Store instance ID in context
    const contextKey = step.config.contextKey || 'instanceId';
    context[contextKey] = instance.id;

    log.info(`Instance created: ${instance.id}`);
  }

  private async executeCommandStep(
    step: WorkflowStep,
    context: Record<string, any>
  ): Promise<void> {
    const instanceId = context[step.config.instanceKey || 'instanceId'];

    if (!instanceId) {
      throw new Error('No instance ID found in context');
    }

    const result = await this.instanceService.executeCommand(
      instanceId,
      step.config.command,
      { timeout: step.config.timeout }
    );

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
  }

  private async executeWaitStep(
    step: WorkflowStep,
    context: Record<string, any>
  ): Promise<void> {
    const duration = step.config.duration || 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  private async executeDestroyInstanceStep(
    step: WorkflowStep,
    context: Record<string, any>
  ): Promise<void> {
    const instanceId = context[step.config.instanceKey || 'instanceId'];

    if (!instanceId) {
      throw new Error('No instance ID found in context');
    }

    await this.instanceService.destroyInstance(instanceId);

    // Remove instance ID from context
    delete context[step.config.instanceKey || 'instanceId'];
  }

  private async executeConditionalStep(
    step: WorkflowStep,
    context: Record<string, any>
  ): Promise<void> {
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
        shouldExecute = contextValue !== undefined;
        break;
      default:
        throw new Error(`Unknown condition operator: ${condition.operator}`);
    }

    if (shouldExecute && step.config.thenStep) {
      await this.executeStep(step.config.thenStep, context);
    } else if (!shouldExecute && step.config.elseStep) {
      await this.executeStep(step.config.elseStep, context);
    }
  }

  private loadDefaultWorkflows(): void {
    // Git Clone and Push Workflow
    this.createWorkflow({
      name: 'Git Clone and Push',
      description: 'Clone a repository, make changes, and push back',
      steps: [
        {
          id: 'create-instance',
          name: 'Create Ubuntu instance',
          type: StepType.CREATE_INSTANCE,
          config: {
            contextKey: 'instanceId',
          },
        },
        {
          id: 'install-git',
          name: 'Install Git',
          type: StepType.EXECUTE_COMMAND,
          config: {
            command: 'apt-get update && apt-get install -y git',
            failOnError: true,
          },
          dependsOn: ['create-instance'],
        },
        {
          id: 'clone-repo',
          name: 'Clone repository',
          type: StepType.EXECUTE_COMMAND,
          config: {
            command: 'git clone ${repoUrl} /workspace',
            failOnError: true,
          },
          dependsOn: ['install-git'],
        },
        {
          id: 'wait-for-changes',
          name: 'Wait for user changes',
          type: StepType.WAIT,
          config: {
            duration: 5000,
          },
          dependsOn: ['clone-repo'],
        },
      ],
    });

    // Development Environment Setup
    this.createWorkflow({
      name: 'Development Environment Setup',
      description: 'Set up a complete development environment',
      steps: [
        {
          id: 'create-instance',
          name: 'Create Ubuntu instance',
          type: StepType.CREATE_INSTANCE,
          config: {
            size: 'shared-cpu-2x',
            memoryMb: 2048,
            contextKey: 'instanceId',
          },
        },
        {
          id: 'update-system',
          name: 'Update system packages',
          type: StepType.EXECUTE_COMMAND,
          config: {
            command: 'apt-get update && apt-get upgrade -y',
            failOnError: true,
          },
          dependsOn: ['create-instance'],
        },
        {
          id: 'install-tools',
          name: 'Install development tools',
          type: StepType.EXECUTE_COMMAND,
          config: {
            command: 'apt-get install -y git curl wget vim tmux build-essential',
            failOnError: true,
          },
          dependsOn: ['update-system'],
        },
        {
          id: 'install-nodejs',
          name: 'Install Node.js',
          type: StepType.EXECUTE_COMMAND,
          config: {
            command: 'curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && apt-get install -y nodejs',
            failOnError: true,
          },
          dependsOn: ['install-tools'],
        },
      ],
    });
  }
}
