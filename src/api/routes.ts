import { Hono } from 'hono';
import { commandRoutes } from '@/api/command-execution';
import { instanceRoutes } from '@/api/instances';
import { monitoringRoutes } from '@/api/monitoring';

export const apiRoutes = new Hono();

// Mount route handlers
apiRoutes.route('/instances', instanceRoutes);
apiRoutes.route('/monitoring', monitoringRoutes);
apiRoutes.route('/commands', commandRoutes);

// API info endpoint
apiRoutes.get('/', (c) => {
  return c.json({
    name: 'Fly Machine Orchestrator API',
    version: '0.1.0',
    endpoints: {
      instances: '/api/instances',
      monitoring: '/api/monitoring',
      commands: '/api/commands',
    },
  });
});
