import {
  InstanceCreateEventSchema,
  InstanceDestroyEventSchema,
  InstanceHealthCheckEventSchema,
  InstanceRestartEventSchema,
} from '@/schemas/index';
import { EventSchemas, Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({
  id: 'fly-machine-orchestrator',
  schemas: new EventSchemas().fromZod({
    'instance/create': {
      data: InstanceCreateEventSchema,
    },
    'instance/destroy': {
      data: InstanceDestroyEventSchema,
    },
    'instance/health-check': {
      data: InstanceHealthCheckEventSchema,
    },
    'instance/restart': {
      data: InstanceRestartEventSchema,
    },
  }),
});
