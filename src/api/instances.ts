import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import * as instanceService from '@/services/instance-service';

export const instanceRoutes = new Hono();

// Validation schemas
const createInstanceSchema = z.object({
  name: z.string().optional(),
  region: z.string().optional(),
  image: z.string().optional(),
  size: z.string().optional(),
  memoryMb: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  secrets: z
    .object({
      githubToken: z.string().optional(),
      githubUsername: z.string().optional(),
    })
    .optional(),
  repoUrl: z.string().optional(),
});

// Create instance
instanceRoutes.post('/', zValidator('json', createInstanceSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await instanceService.createInstanceWithGitHub(body);

  if (result.isErr()) {
    throw result.error;
  }

  return c.json(result.value, 201);
});

// List instances
instanceRoutes.get('/', async (c) => {
  const instances = await instanceService.listInstances();
  return c.json(instances);
});

// Get instance
instanceRoutes.get('/:id', async (c) => {
  const instanceId = c.req.param('id');
  const result = await instanceService.getInstance(instanceId);

  if (result.isErr()) {
    throw result.error;
  }

  return c.json(result.value);
});

// Stop instance
instanceRoutes.post('/:id/stop', async (c) => {
  const instanceId = c.req.param('id');
  const result = await instanceService.stopInstance(instanceId);

  if (result.isErr()) {
    throw result.error;
  }

  return c.json(result.value);
});

// Start instance
instanceRoutes.post('/:id/start', async (c) => {
  const instanceId = c.req.param('id');
  const result = await instanceService.startInstance(instanceId);

  if (result.isErr()) {
    throw result.error;
  }

  return c.json(result.value);
});

// Restart instance
instanceRoutes.post('/:id/restart', async (c) => {
  const instanceId = c.req.param('id');
  const result = await instanceService.restartInstance(instanceId);

  if (result.isErr()) {
    throw result.error;
  }

  return c.json(result.value);
});

// Health check instance
instanceRoutes.get('/:id/health', async (c) => {
  const instanceId = c.req.param('id');
  const result = await instanceService.healthCheckInstance(instanceId);

  if (result.isErr()) {
    throw result.error;
  }

  return c.json({
    instanceId,
    healthy: result.value,
    timestamp: new Date().toISOString(),
  });
});

// Destroy instance
instanceRoutes.delete('/:id', async (c) => {
  const instanceId = c.req.param('id');
  const result = await instanceService.destroyInstance(instanceId);

  if (result.isErr()) {
    throw result.error;
  }

  return c.json({ message: 'Instance destroyed successfully' });
});

// Get instance statistics
instanceRoutes.get('/stats/summary', async (c) => {
  const stats = instanceService.getInstanceStats();
  return c.json(stats);
});
