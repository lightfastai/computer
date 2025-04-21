/**
 * Zod schemas for lightfast computer integration
 */
import { type Agent, AgentSchema } from './agent';
import { type ConnectionOptions, ConnectionOptionsSchema } from './connection-options';
import { type Message, MessageSchema } from './message';

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
