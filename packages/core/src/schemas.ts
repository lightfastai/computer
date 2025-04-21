/**
 * Zod schemas for lightfast computer integration
 */
import { z } from 'zod';

// Define enums as Zod enums
export const AgentTypeSchema = z.enum(['blender', 'ableton', 'touchdesigner']);
export type AgentType = z.infer<typeof AgentTypeSchema>;

export const AgentStatusSchema = z.enum(['connected', 'disconnected', 'busy', 'error']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const MessageTypeSchema = z.enum(['command', 'response', 'event', 'error']);
export type MessageType = z.infer<typeof MessageTypeSchema>;

// Define Agent schema
export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: AgentTypeSchema,
  status: AgentStatusSchema,
  capabilities: z.array(z.string()),
});
export type Agent = z.infer<typeof AgentSchema>;

// Define Message schema
export const MessageSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().int().positive(),
  sender: z.string().min(1),
  recipient: z.string().min(1),
  content: z.string(),
  type: MessageTypeSchema,
});
export type Message = z.infer<typeof MessageSchema>;

// Define ConnectionOptions schema
export const ConnectionOptionsSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(8080),
  secure: z.boolean().default(false),
  timeout: z.number().int().positive().default(5000),
});
export type ConnectionOptions = z.infer<typeof ConnectionOptionsSchema>;

// Validation functions
export const validateAgent = (agent: unknown): Agent => {
  return AgentSchema.parse(agent);
};

export const validateMessage = (message: unknown): Message => {
  return MessageSchema.parse(message);
};

export const validateConnectionOptions = (options: unknown): ConnectionOptions => {
  return ConnectionOptionsSchema.parse(options);
};

// Partial validation for updates
export const validatePartialAgent = (agent: unknown): Partial<Agent> => {
  return AgentSchema.partial().parse(agent);
};
