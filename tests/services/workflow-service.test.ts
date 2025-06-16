import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as workflowService from '@/services/workflow-service';
import * as instanceService from '@/services/instance-service';
import { WorkflowStatus, StepType, InstanceStatus } from '@/types/index';
import { NotFoundError } from '@/lib/error-handler';

// Mock dependencies
vi.mock('@/services/instance-service');

describe('workflow-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workflowService.clearAllWorkflows();
  });

  describe('createWorkflow', () => {
    it('should create a workflow', async () => {
      const workflow = await workflowService.createWorkflow({
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [
          {
            id: 'step1',
            name: 'Create Instance',
            type: StepType.CREATE_INSTANCE,
            config: { name: 'test-instance' },
          },
        ],
      });

      expect(workflow).toMatchObject({
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: expect.arrayContaining([
          expect.objectContaining({
            id: 'step1',
            type: StepType.CREATE_INSTANCE,
          }),
        ]),
      });
      expect(workflow.id).toBeDefined();
      expect(workflow.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getWorkflow', () => {
    it('should get a workflow by id', async () => {
      const created = await workflowService.createWorkflow({
        name: 'Test Workflow',
        steps: [],
      });

      const workflow = await workflowService.getWorkflow(created.id);
      expect(workflow.id).toBe(created.id);
    });

    it('should throw NotFoundError for non-existent workflow', async () => {
      await expect(
        workflowService.getWorkflow('non-existent')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a simple workflow', async () => {
      const mockInstance = {
        id: 'instance-123',
        status: InstanceStatus.RUNNING,
      };

      vi.mocked(instanceService.createInstance).mockResolvedValue(mockInstance as any);

      const workflow = await workflowService.createWorkflow({
        name: 'Simple Workflow',
        steps: [
          {
            id: 'create',
            name: 'Create Instance',
            type: StepType.CREATE_INSTANCE,
            config: { name: 'test-instance' },
          },
        ],
      });

      const execution = await workflowService.executeWorkflow(workflow.id);

      expect(execution).toMatchObject({
        workflowId: workflow.id,
        status: WorkflowStatus.PENDING,
      });

      // Wait for async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updatedExecution = await workflowService.getExecution(execution.id);
      expect(updatedExecution.status).toBe(WorkflowStatus.COMPLETED);
    });

    it('should handle workflow with dependencies', async () => {
      const mockInstance = {
        id: 'instance-123',
        status: InstanceStatus.RUNNING,
      };

      vi.mocked(instanceService.createInstance).mockResolvedValue(mockInstance as any);
      vi.mocked(instanceService.executeCommand).mockResolvedValue({
        id: 'exec-123',
        status: 'completed',
        output: 'Hello World',
        exitCode: 0,
      } as any);

      const workflow = await workflowService.createWorkflow({
        name: 'Dependent Workflow',
        steps: [
          {
            id: 'create',
            name: 'Create Instance',
            type: StepType.CREATE_INSTANCE,
            config: { name: 'test-instance' },
          },
          {
            id: 'execute',
            name: 'Execute Command',
            type: StepType.EXECUTE_COMMAND,
            config: { command: 'echo "Hello World"' },
            dependsOn: ['create'],
          },
        ],
      });

      const execution = await workflowService.executeWorkflow(workflow.id);

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 200));

      const updatedExecution = await workflowService.getExecution(execution.id);
      expect(updatedExecution.status).toBe(WorkflowStatus.COMPLETED);

      expect(instanceService.createInstance).toHaveBeenCalledOnce();
      expect(instanceService.executeCommand).toHaveBeenCalledWith(
        'instance-123',
        'echo "Hello World"',
        expect.any(Object)
      );
    });

    it('should fail on circular dependencies', async () => {
      const workflow = await workflowService.createWorkflow({
        name: 'Circular Workflow',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            type: StepType.WAIT,
            config: { duration: 100 },
            dependsOn: ['step2'],
          },
          {
            id: 'step2',
            name: 'Step 2',
            type: StepType.WAIT,
            config: { duration: 100 },
            dependsOn: ['step1'],
          },
        ],
      });

      const execution = await workflowService.executeWorkflow(workflow.id);

      // Wait for execution to fail
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updatedExecution = await workflowService.getExecution(execution.id);
      expect(updatedExecution.status).toBe(WorkflowStatus.FAILED);
      expect(updatedExecution.error).toContain('Circular dependency');
    });
  });

  describe('listWorkflows', () => {
    it('should list all workflows', async () => {
      await workflowService.createWorkflow({ name: 'Workflow 1', steps: [] });
      await workflowService.createWorkflow({ name: 'Workflow 2', steps: [] });

      const workflows = await workflowService.listWorkflows();
      expect(workflows).toHaveLength(2);
      expect(workflows.map((w) => w.name)).toContain('Workflow 1');
      expect(workflows.map((w) => w.name)).toContain('Workflow 2');
    });
  });

  describe('listExecutions', () => {
    it('should list executions for a workflow', async () => {
      const workflow = await workflowService.createWorkflow({
        name: 'Test Workflow',
        steps: [
          {
            id: 'wait',
            name: 'Wait',
            type: StepType.WAIT,
            config: { duration: 50 },
          },
        ],
      });

      await workflowService.executeWorkflow(workflow.id);
      await workflowService.executeWorkflow(workflow.id);

      const executions = await workflowService.listExecutions(workflow.id);
      expect(executions).toHaveLength(2);
      expect(executions.every((e) => e.workflowId === workflow.id)).toBe(true);
    });

    it('should list all executions when no workflow specified', async () => {
      const workflow1 = await workflowService.createWorkflow({
        name: 'Workflow 1',
        steps: [],
      });
      const workflow2 = await workflowService.createWorkflow({
        name: 'Workflow 2',
        steps: [],
      });

      await workflowService.executeWorkflow(workflow1.id);
      await workflowService.executeWorkflow(workflow2.id);

      const executions = await workflowService.listExecutions();
      expect(executions).toHaveLength(2);
    });
  });
});