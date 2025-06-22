import { apiRoutes } from '@/api/routes';
import { config } from '@/lib/config';
import { errorHandler } from '@/lib/error-handler';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
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

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Start server
async function start() {
  try {
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
