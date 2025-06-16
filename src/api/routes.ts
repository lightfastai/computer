import { Hono } from 'hono';
import { instanceRoutes } from './instances';
import { workflowRoutes } from './workflows';
import { monitoringRoutes } from './monitoring';
import { authMiddleware } from './middleware/auth';

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