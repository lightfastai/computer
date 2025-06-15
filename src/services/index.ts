import pino from 'pino';
import { FlyService } from './fly-service';
import { SSHService } from './ssh-service';
import { InstanceService } from './instance-service';
import { WorkflowService } from './workflow-service';

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