import { Hono } from 'hono';

export const monitoringRoutes = new Hono();

// Health check with Inngest status
monitoringRoutes.get('/health', async (c) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'running',
      inngest: process.env.INNGEST_ENABLED === 'true' ? 'enabled' : 'disabled',
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
    },
  };

  return c.json(health);
});

// Inngest dashboard info
monitoringRoutes.get('/inngest', (c) => {
  if (process.env.INNGEST_ENABLED !== 'true') {
    return c.json({
      enabled: false,
      message: 'Inngest is disabled. Set INNGEST_ENABLED=true to enable.',
    });
  }

  return c.json({
    enabled: true,
    endpoints: {
      events: '/api/inngest',
      dashboard: process.env.NODE_ENV === 'development' ? 'http://localhost:8288' : 'https://app.inngest.com',
    },
    functions: ['create-instance', 'destroy-instance', 'health-check-instance', 'restart-instance'],
    info: 'Inngest provides reliable background job processing with retries, monitoring, and observability.',
  });
});
