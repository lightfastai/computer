import { instanceService } from '@/services/index';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

export const instanceRoutes = new Hono();

// Validation schemas
const createInstanceSchema = z.object({
  name: z.string().optional(),
  region: z.string().optional(),
  image: z.string().optional(),
  size: z.string().optional(),
  memoryMb: z.number().optional(),
  metadata: z.record(z.any()).optional(),
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

// Restart instance
instanceRoutes.post('/:id/restart', async (c) => {
  const instanceId = c.req.param('id');
  const instance = await instanceService.restartInstance(instanceId);
  return c.json(instance);
});

// Health check instance
instanceRoutes.get('/:id/health', async (c) => {
  const instanceId = c.req.param('id');
  const healthy = await instanceService.healthCheckInstance(instanceId);
  return c.json({
    instanceId,
    healthy,
    timestamp: new Date().toISOString(),
  });
});

// Destroy instance
instanceRoutes.delete('/:id', async (c) => {
  const instanceId = c.req.param('id');
  await instanceService.destroyInstance(instanceId);
  return c.json({ message: 'Instance destroyed successfully' });
});

// Get instance statistics
instanceRoutes.get('/stats/summary', async (c) => {
  const stats = instanceService.getInstanceStats();
  return c.json(stats);
});
