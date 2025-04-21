/**
 * Types for the lightfast computer integration
 * @deprecated Use schemas.ts instead
 */

import type {
  Agent as SchemaAgent,
  AgentStatus as SchemaAgentStatus,
  AgentType as SchemaAgentType,
  ConnectionOptions as SchemaConnectionOptions,
  Message as SchemaMessage,
  MessageType as SchemaMessageType,
} from './schemas';

// Re-export types from schemas.ts for backward compatibility
export type Agent = SchemaAgent;
export type Message = SchemaMessage;
export type ConnectionOptions = SchemaConnectionOptions;
export type AgentType = SchemaAgentType;
export type AgentStatus = SchemaAgentStatus;
export type MessageType = SchemaMessageType;

// Constants for backward compatibility
export const AgentType = {
  BLENDER: 'blender',
  ABLETON: 'ableton',
  TOUCHDESIGNER: 'touchdesigner',
} as const;

export const AgentStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  BUSY: 'busy',
  ERROR: 'error',
} as const;

export const MessageType = {
  COMMAND: 'command',
  RESPONSE: 'response',
  EVENT: 'event',
  ERROR: 'error',
} as const;
