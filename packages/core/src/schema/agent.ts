import z from 'zod';
import { AgentStatusSchema } from './agent-status';
import { AgentTypeSchema } from './agent-type';

// Define Agent schema

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: AgentTypeSchema,
  status: AgentStatusSchema,
  capabilities: z.array(z.string()),
});
export type Agent = z.infer<typeof AgentSchema>;
