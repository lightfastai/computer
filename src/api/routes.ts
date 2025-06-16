import { instanceRoutes } from '@/api/instances';
import { authMiddleware } from '@/api/middleware/auth';
import { monitoringRoutes } from '@/api/monitoring';
import { workflowRoutes } from '@/api/workflows';
import { Hono } from 'hono';

export const apiRoutes = new Hono();

// Apply authentication middleware if API key is configured
apiRoutes.use('*', authMiddleware);

// Mount route handlers
apiRoutes.route('/instances', instanceRoutes);
apiRoutes.route('/workflows', workflowRoutes);
apiRoutes.route('/monitoring', monitoringRoutes);

// API info endpoint
apiRoutes.get('/', (c) => {
  return c.json({
    name: 'Fly.io Workflow Orchestrator API',
    version: '0.1.0',
    endpoints: {
      instances: '/api/instances',
      workflows: '/api/workflows',
      monitoring: '/api/monitoring',
      inngest: '/api/inngest',
    },
    features: {
      inngest: process.env.INNGEST_ENABLED === 'true' ? 'enabled' : 'disabled',
    },
  });
});
