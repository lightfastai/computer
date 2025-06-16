import { inngest } from '@/lib/inngest';
import { instanceService } from '@/services/index';
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

      try {
        const result = await instanceService.createInstance(options);
        return result;
      } catch (error) {
        log.error(`Failed to create instance ${instanceId}:`, error);
        throw error;
      }
    });

    // Step 2: Wait for instance to be ready
    await step.sleep('wait-for-ready', '5s');

    // Step 3: Verify instance is running
    const verifiedInstance = await step.run('verify-instance', async () => {
      const inst = await instanceService.getInstance(instance.id);

      if (inst.status !== 'running') {
        throw new Error(`Instance ${instance.id} is not running: ${inst.status}`);
      }

      return inst;
    });

    // Step 4: Initial health check
    const isHealthy = await step.run('initial-health-check', async () => {
      const healthy = await instanceService.healthCheckInstance(instance.id);

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

      try {
        const instance = await instanceService.getInstance(instanceId);

        if (instance.status === 'running') {
          await instanceService.stopInstance(instanceId);
          log.info(`Stopped instance ${instanceId} before destruction`);
        }
      } catch (error) {
        log.warn(`Error stopping instance ${instanceId}:`, error);
        // Continue with destruction even if stop fails
      }
    });

    // Step 2: Wait before destroying
    await step.sleep('wait-before-destroy', '2s');

    // Step 3: Destroy the instance
    await step.run('destroy-fly-machine', async () => {
      try {
        await instanceService.destroyInstance(instanceId);
        log.info(`Instance ${instanceId} destroyed successfully`);
      } catch (error) {
        log.error(`Failed to destroy instance ${instanceId}:`, error);
        throw error;
      }
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

      try {
        const isHealthy = await instanceService.healthCheckInstance(instanceId);

        if (!isHealthy) {
          log.warn(`Instance ${instanceId} is unhealthy`);

          // Get instance details for debugging
          const instance = await instanceService.getInstance(instanceId);
          log.info(`Instance ${instanceId} status: ${instance.status}`);
        }

        return isHealthy;
      } catch (error) {
        log.error(`Health check failed for instance ${instanceId}:`, error);
        return false;
      }
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
      const instance = await instanceService.getInstance(instanceId);
      return {
        status: instance.status,
        flyMachineId: instance.flyMachineId,
      };
    });

    // Step 2: Stop the instance if running
    if (originalState.status === 'running') {
      await step.run('stop-instance', async () => {
        await instanceService.stopInstance(instanceId);
        log.info(`Stopped instance ${instanceId}`);
      });

      // Wait for stop to complete
      await step.sleep('wait-after-stop', '3s');
    }

    // Step 3: Start the instance
    const restartedInstance = await step.run('start-instance', async () => {
      const instance = await instanceService.startInstance(instanceId);
      log.info(`Started instance ${instanceId}`);
      return instance;
    });

    // Step 4: Wait for instance to be ready
    await step.sleep('wait-for-ready', '5s');

    // Step 5: Verify instance is healthy
    const healthy = await step.run('verify-health', async () => {
      const isHealthy = await instanceService.healthCheckInstance(instanceId);

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
