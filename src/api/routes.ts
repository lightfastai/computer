import { instanceRoutes } from '@/api/instances';
import { monitoringRoutes } from '@/api/monitoring';
import { Hono } from 'hono';

export const apiRoutes = new Hono();

// Mount route handlers
apiRoutes.route('/instances', instanceRoutes);
apiRoutes.route('/monitoring', monitoringRoutes);

// API info endpoint
apiRoutes.get('/', (c) => {
  return c.json({
    name: 'Fly Machine Orchestrator API',
    version: '0.1.0',
    endpoints: {
      instances: '/api/instances',
      monitoring: '/api/monitoring',
      inngest: '/api/inngest',
    },
    features: {
      inngest: process.env.INNGEST_ENABLED === 'true' ? 'enabled' : 'disabled',
    },
  });
});
