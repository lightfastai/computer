import { Hono } from 'hono';

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
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
    },
  };

  return c.json(health);
});
