import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { workflowService } from '../services';
import { StepType } from '../types';

export const workflowRoutes = new Hono();

// Validation schemas
const workflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(StepType),
  config: z.record(z.any()),
  dependsOn: z.array(z.string()).optional(),
});

const createWorkflowSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(workflowStepSchema),
  userId: z.string().optional(),
});

const executeWorkflowSchema = z.object({
  context: z.record(z.any()).optional(),
});

// Create workflow
workflowRoutes.post('/', zValidator('json', createWorkflowSchema), async (c) => {
  const body = c.req.valid('json');
  const workflow = await workflowService.createWorkflow(body);
  return c.json(workflow, 201);
});

// List workflows
workflowRoutes.get('/', async (c) => {
  const workflows = await workflowService.listWorkflows();
  return c.json(workflows);
});

// Get workflow
workflowRoutes.get('/:id', async (c) => {
  const workflowId = c.req.param('id');
  const workflow = await workflowService.getWorkflow(workflowId);
  return c.json(workflow);
});

// Execute workflow
workflowRoutes.post('/:id/execute', zValidator('json', executeWorkflowSchema), async (c) => {
  const workflowId = c.req.param('id');
  const body = c.req.valid('json');

  const execution = await workflowService.executeWorkflow(
    workflowId,
    body.context || {}
  );

  return c.json(execution, 202); // 202 Accepted - async operation
});

// List workflow executions
workflowRoutes.get('/:id/executions', async (c) => {
  const workflowId = c.req.param('id');
  const executions = await workflowService.listExecutions(workflowId);
  return c.json(executions);
});

// Get workflow execution
workflowRoutes.get('/executions/:executionId', async (c) => {
  const executionId = c.req.param('executionId');
  const execution = await workflowService.getExecution(executionId);
  return c.json(execution);
});

// List all executions
workflowRoutes.get('/executions', async (c) => {
  const executions = await workflowService.listExecutions();
  return c.json(executions);
});
