import { FlyService } from '@/services/fly-service';
import { InstanceService } from '@/services/instance-service';
import { SSHService } from '@/services/ssh-service';
import { WorkflowService } from '@/services/workflow-service';
import pino from 'pino';

const log = pino();

// Service instances
export let flyService: FlyService;
export let sshService: SSHService;
export let instanceService: InstanceService;
export let workflowService: WorkflowService;

export async function initializeServices() {
  log.info('Initializing services...');

  // Initialize Fly.io service
  flyService = new FlyService();

  // Initialize SSH service
  sshService = new SSHService();

  // Initialize instance service
  instanceService = new InstanceService(flyService, sshService);

  // Initialize workflow service
  workflowService = new WorkflowService(instanceService);

  log.info('Services initialized successfully');
}
