import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { instanceService } from '../services';

export const instanceRoutes = new Hono();

// Validation schemas
const createInstanceSchema = z.object({
  name: z.string().optional(),
  region: z.string().optional(),
  image: z.string().optional(),
  size: z.string().optional(),
  memoryMb: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  sshKeyContent: z.string().optional(),
});

const executeCommandSchema = z.object({
  command: z.string(),
  timeout: z.number().optional(),
});

// Create instance
instanceRoutes.post('/', zValidator('json', createInstanceSchema), async (c) => {
  const body = c.req.valid('json');
  const instance = await instanceService.createInstance(body);
  return c.json(instance, 201);
});

// List instances
instanceRoutes.get('/', async (c) => {
  const instances = await instanceService.listInstances();
  return c.json(instances);
});

// Get instance
instanceRoutes.get('/:id', async (c) => {
  const instanceId = c.req.param('id');
  const instance = await instanceService.getInstance(instanceId);
  return c.json(instance);
});

// Stop instance
instanceRoutes.post('/:id/stop', async (c) => {
  const instanceId = c.req.param('id');
  const instance = await instanceService.stopInstance(instanceId);
  return c.json(instance);
});

// Start instance
instanceRoutes.post('/:id/start', async (c) => {
  const instanceId = c.req.param('id');
  const instance = await instanceService.startInstance(instanceId);
  return c.json(instance);
});

// Destroy instance
instanceRoutes.delete('/:id', async (c) => {
  const instanceId = c.req.param('id');
  await instanceService.destroyInstance(instanceId);
  return c.json({ message: 'Instance destroyed successfully' });
});

// Execute command
instanceRoutes.post('/:id/exec', zValidator('json', executeCommandSchema), async (c) => {
  const instanceId = c.req.param('id');
  const body = c.req.valid('json');
  
  const execution = await instanceService.executeCommand(
    instanceId,
    body.command,
    { timeout: body.timeout }
  );
  
  return c.json(execution);
});

// Get command execution
instanceRoutes.get('/executions/:executionId', async (c) => {
  const executionId = c.req.param('executionId');
  const execution = await instanceService.getCommandExecution(executionId);
  return c.json(execution);
});