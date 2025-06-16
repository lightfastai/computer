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

    // Step 4: Set up monitoring (future feature)
    await step.run('setup-monitoring', async () => {
      log.info(`Instance ${instance.id} created successfully`);
      // TODO: Set up health checks, alerts, etc.
    });

    return {
      instanceId: instance.id,
      status: verifiedInstance.status,
      privateIp: verifiedInstance.privateIpAddress,
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

    // Step 1: Stop any running commands
    await step.run('stop-commands', async () => {
      log.info(`Stopping any running commands on instance ${instanceId}`);
      // TODO: Implement command cancellation
    });

    // Step 2: Destroy the instance
    await step.run('destroy-fly-machine', async () => {
      try {
        await instanceService.destroyInstance(instanceId);
        log.info(`Instance ${instanceId} destroyed successfully`);
      } catch (error) {
        log.error(`Failed to destroy instance ${instanceId}:`, error);
        throw error;
      }
    });

    // Step 3: Clean up any resources
    await step.run('cleanup-resources', async () => {
      // TODO: Clean up any associated resources (volumes, IPs, etc.)
    });

    return { instanceId, destroyed: true };
  },
);
