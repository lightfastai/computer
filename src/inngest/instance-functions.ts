import { inngest } from '@/lib/inngest';
import * as instanceService from '@/services/instance-service';
import pino from 'pino';

const log = pino();

// Create instance with retries and error handling
export const createInstance = inngest.createFunction(
  {
    id: 'create-instance',
    retries: 3,
    throttle: {
      limit: 10,
      period: '60s',
    },
  },
  { event: 'instance/create' },
  async ({ event, step }) => {
    const { instanceId, ...options } = event.data;

    // Step 1: Create the Fly.io machine
    const instance = await step.run('create-fly-machine', async () => {
      log.info(`Creating instance ${instanceId} with options:`, options);

      const result = await instanceService.createInstance(options);
      
      if (result.isErr()) {
        log.error(`Failed to create instance ${instanceId}:`, result.error);
        throw result.error;
      }
      
      return result.value;
    });

    // Step 2: Wait for instance to be ready
    await step.sleep('wait-for-ready', '5s');

    // Step 3: Verify instance is running
    const verifiedInstance = await step.run('verify-instance', async () => {
      const result = await instanceService.getInstance(instance.id);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      const inst = result.value;

      if (inst.status !== 'running') {
        throw new Error(`Instance ${instance.id} is not running: ${inst.status}`);
      }

      return inst;
    });

    // Step 4: Initial health check
    const isHealthy = await step.run('initial-health-check', async () => {
      const result = await instanceService.healthCheckInstance(instance.id);
      
      if (result.isErr()) {
        log.error(`Health check error for instance ${instance.id}:`, result.error);
        return false;
      }
      
      const healthy = result.value;

      if (!healthy) {
        log.warn(`Instance ${instance.id} failed initial health check`);
      }

      return healthy;
    });

    return {
      instanceId: instance.id,
      status: verifiedInstance.status,
      privateIp: verifiedInstance.privateIpAddress,
      healthy: isHealthy,
    };
  },
);

// Destroy instance with cleanup
export const destroyInstance = inngest.createFunction(
  {
    id: 'destroy-instance',
    retries: 3,
  },
  { event: 'instance/destroy' },
  async ({ event, step }) => {
    const { instanceId } = event.data;

    // Step 1: Stop instance if running
    await step.run('stop-instance', async () => {
      log.info(`Preparing to destroy instance ${instanceId}`);

      const instanceResult = await instanceService.getInstance(instanceId);
      
      if (instanceResult.isOk()) {
        const instance = instanceResult.value;
        
        if (instance.status === 'running') {
          const stopResult = await instanceService.stopInstance(instanceId);
          
          if (stopResult.isOk()) {
            log.info(`Stopped instance ${instanceId} before destruction`);
          } else {
            log.warn(`Error stopping instance ${instanceId}:`, stopResult.error);
          }
        }
      } else {
        log.warn(`Could not get instance ${instanceId}:`, instanceResult.error);
        // Continue with destruction even if getInstance fails
      }
    });

    // Step 2: Wait before destroying
    await step.sleep('wait-before-destroy', '2s');

    // Step 3: Destroy the instance
    await step.run('destroy-fly-machine', async () => {
      const result = await instanceService.destroyInstance(instanceId);
      
      if (result.isErr()) {
        log.error(`Failed to destroy instance ${instanceId}:`, result.error);
        throw result.error;
      }
      
      log.info(`Instance ${instanceId} destroyed successfully`);
    });

    return { instanceId, destroyed: true };
  },
);

// Health check instances periodically
export const healthCheckInstance = inngest.createFunction(
  {
    id: 'health-check-instance',
    retries: 2,
  },
  { event: 'instance/health-check' },
  async ({ event, step }) => {
    const { instanceId } = event.data;

    const healthy = await step.run('check-health', async () => {
      log.info(`Performing health check for instance ${instanceId}`);

      const result = await instanceService.healthCheckInstance(instanceId);
      
      if (result.isErr()) {
        log.error(`Health check failed for instance ${instanceId}:`, result.error);
        return false;
      }
      
      const isHealthy = result.value;

      if (!isHealthy) {
        log.warn(`Instance ${instanceId} is unhealthy`);

        // Get instance details for debugging
        const instanceResult = await instanceService.getInstance(instanceId);
        if (instanceResult.isOk()) {
          log.info(`Instance ${instanceId} status: ${instanceResult.value.status}`);
        }
      }

      return isHealthy;
    });

    // If unhealthy, trigger restart
    if (!healthy) {
      await step.sendEvent('trigger-restart', {
        name: 'instance/restart',
        data: { instanceId },
      });
    }

    return { instanceId, healthy };
  },
);

// Restart instance with proper sequencing
export const restartInstance = inngest.createFunction(
  {
    id: 'restart-instance',
    retries: 3,
  },
  { event: 'instance/restart' },
  async ({ event, step }) => {
    const { instanceId } = event.data;

    log.info(`Restarting instance ${instanceId}`);

    // Step 1: Get current instance state
    const originalState = await step.run('get-instance-state', async () => {
      const result = await instanceService.getInstance(instanceId);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      const instance = result.value;
      return {
        status: instance.status,
        flyMachineId: instance.flyMachineId,
      };
    });

    // Step 2: Stop the instance if running
    if (originalState.status === 'running') {
      await step.run('stop-instance', async () => {
        const result = await instanceService.stopInstance(instanceId);
        
        if (result.isErr()) {
          throw result.error;
        }
        
        log.info(`Stopped instance ${instanceId}`);
      });

      // Wait for stop to complete
      await step.sleep('wait-after-stop', '3s');
    }

    // Step 3: Start the instance
    const restartedInstance = await step.run('start-instance', async () => {
      const result = await instanceService.startInstance(instanceId);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      log.info(`Started instance ${instanceId}`);
      return result.value;
    });

    // Step 4: Wait for instance to be ready
    await step.sleep('wait-for-ready', '5s');

    // Step 5: Verify instance is healthy
    const healthy = await step.run('verify-health', async () => {
      const result = await instanceService.healthCheckInstance(instanceId);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      const isHealthy = result.value;

      if (!isHealthy) {
        throw new Error(`Instance ${instanceId} is not healthy after restart`);
      }

      return isHealthy;
    });

    return {
      instanceId,
      status: restartedInstance.status,
      healthy,
    };
  },
);
