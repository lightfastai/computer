import { z } from 'zod';

export const AgentTypeSchema = z.enum(['blender', 'ableton', 'touchdesigner']);
export type AgentType = z.infer<typeof AgentTypeSchema>;
