import { z } from 'zod';

export const AgentStatusSchema = z.enum(['connected', 'disconnected', 'busy', 'error']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
