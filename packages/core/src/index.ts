// Core functionality for lightfast computer integration

import { type Agent, AgentSchema } from './schema/agent';
import { type AgentStatus, AgentStatusSchema } from './schema/agent-status';
import { type AgentType, AgentTypeSchema } from './schema/agent-type';
import { type ConnectionOptions, ConnectionOptionsSchema } from './schema/connection-options';
import { type Message, MessageSchema } from './schema/message';
import { type MessageType, MessageTypeSchema } from './schema/message-type';
// Export schemas and types
import {
  validateAgent,
  validateConnectionOptions,
  validateMessage,
  validatePartialAgent,
} from './schema/schemas';

// Export agent functionality
import {
  sendMessage as agentSendMessage,
  connectAgent,
  createAgent,
  createMessage,
  disconnectAgent,
  hasCapability,
  hasError,
  isBusy,
  isConnected,
  isDisconnected,
  setCapabilities,
  updateAgentStatus,
} from './agent';

// Export communication functionality
import {
  type CommunicationState,
  sendMessage as communicationSendMessage,
  createCommunicationState,
  getAgent,
  getAgents,
  handleMessage,
  onMessage,
  registerAgent,
  unregisterAgent,
} from './communication';

// Export all the imported items
// Export types
export type {
  Agent,
  AgentStatus,
  AgentType,
  ConnectionOptions,
  Message,
  MessageType,
  CommunicationState,
};

// Export values
export {
  // Schemas
  AgentSchema,
  AgentStatusSchema,
  AgentTypeSchema,
  ConnectionOptionsSchema,
  MessageSchema,
  MessageTypeSchema,
  validateAgent,
  validateConnectionOptions,
  validateMessage,
  validatePartialAgent,
  // Agent functionality
  connectAgent,
  createAgent,
  createMessage,
  disconnectAgent,
  agentSendMessage,
  hasCapability,
  hasError,
  isBusy,
  isConnected,
  isDisconnected,
  setCapabilities,
  updateAgentStatus,
  // Communication functionality
  createCommunicationState,
  getAgent,
  getAgents,
  handleMessage,
  onMessage,
  registerAgent,
  communicationSendMessage,
  unregisterAgent,
};

export * from './adapters/ableton-adapter';
export * from './adapters/blender-adapter';
export * from './adapters/touchdesigner-adapter';
