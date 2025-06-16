import pino from 'pino';

const log = pino();

// Export all services
export * as flyService from '@/services/fly-service';
export * as instanceService from '@/services/instance-service';

// Initialize services
export async function initializeServices() {
  log.info('Initializing services...');
  // Add any initialization logic here if needed
  log.info('Services initialized successfully');
}
