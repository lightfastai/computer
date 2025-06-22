import { Hono } from 'hono';
import { config } from '@/lib/config';

export const monitoringRoutes = new Hono();

// Health check
monitoringRoutes.get('/health', async (c) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'running',
    },
    environment: {
      nodeEnv: config.nodeEnv,
      port: config.port,
    },
  };

  return c.json(health);
});
