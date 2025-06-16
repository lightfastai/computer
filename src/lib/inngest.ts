import { type EventSchemas, Inngest } from 'inngest';
import { z } from 'zod';

// Define event schemas for type safety
const eventSchemas = {
  'instance/create': {
    data: z.object({
      instanceId: z.string(),
      name: z.string().optional(),
      region: z.string().optional(),
      size: z.string().optional(),
      memoryMb: z.number().optional(),
    }),
  },
  'instance/destroy': {
    data: z.object({
      instanceId: z.string(),
    }),
  },
  'command/execute': {
    data: z.object({
      instanceId: z.string(),
      command: z.string(),
      timeout: z.number().optional(),
      executionId: z.string(),
    }),
  },
  'workflow/execute': {
    data: z.object({
      workflowId: z.string(),
      executionId: z.string(),
      context: z.record(z.any()),
    }),
  },
  'workflow/step': {
    data: z.object({
      workflowId: z.string(),
      executionId: z.string(),
      stepId: z.string(),
      stepIndex: z.number(),
      totalSteps: z.number(),
    }),
  },
} satisfies EventSchemas;

// Create Inngest client
export const inngest = new Inngest({
  id: 'fly-workflow-orchestrator',
  schemas: {
    events: eventSchemas,
  },
});

// Type exports for events
export type InngestEvents = {
  'instance/create': z.infer<(typeof eventSchemas)['instance/create']['data']>;
  'instance/destroy': z.infer<(typeof eventSchemas)['instance/destroy']['data']>;
  'command/execute': z.infer<(typeof eventSchemas)['command/execute']['data']>;
  'workflow/execute': z.infer<(typeof eventSchemas)['workflow/execute']['data']>;
  'workflow/step': z.infer<(typeof eventSchemas)['workflow/step']['data']>;
};
