import {
  CommandExecuteEventSchema,
  InstanceCreateEventSchema,
  InstanceDestroyEventSchema,
  WorkflowExecuteEventSchema,
} from '@/schemas/index';
import { EventSchemas, Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({
  id: 'fly-workflow-orchestrator',
  schemas: new EventSchemas().fromZod({
    'instance/create': {
      data: InstanceCreateEventSchema,
    },
    'instance/destroy': {
      data: InstanceDestroyEventSchema,
    },
    'command/execute': {
      data: CommandExecuteEventSchema,
    },
    'workflow/execute': {
      data: WorkflowExecuteEventSchema,
    },
  }),
});
