import { apiRoutes } from '@/api/routes';
import { createInstance, destroyInstance, healthCheckInstance, restartInstance } from '@/inngest/instance-functions';
import { config } from '@/lib/config';
import { errorHandler } from '@/lib/error-handler';
import { inngest } from '@/lib/inngest';
import { initializeServices } from '@/services/index';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serve as serveInngest } from 'inngest/hono';
import pino from 'pino';

const log = pino({
  level: config.logLevel,
  ...(config.nodeEnv === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

const app = new Hono();

// Global middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

// Error handling
app.onError(errorHandler);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

// API routes
app.route('/api', apiRoutes);

// Inngest endpoint for receiving events and running functions
app.use(
  '/api/inngest',
  serveInngest({
    client: inngest,
    functions: [createInstance, destroyInstance, healthCheckInstance, restartInstance],
  }),
);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Initialize services and start server
async function start() {
  try {
    await initializeServices();

    const port = config.port;
    log.info(`Starting server on port ${port}`);

    serve({
      fetch: app.fetch,
      port,
    });

    log.info(`Server running at http://localhost:${port}`);
  } catch (error) {
    log.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
