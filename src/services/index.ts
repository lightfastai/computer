import * as workflowService from '@/services/workflow-service';
import pino from 'pino';

const log = pino();

// Export all services
export * as flyService from '@/services/fly-service';
export * as sshService from '@/services/ssh-service';
export * as instanceService from '@/services/instance-service';
export * as workflowService from '@/services/workflow-service';

// Initialize services
export async function initializeServices() {
  log.info('Initializing services...');

  // Initialize default workflows
  workflowService.initializeDefaultWorkflows();

  log.info('Services initialized successfully');
}
