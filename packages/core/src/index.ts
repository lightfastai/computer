// Core functionality for lightfast computer integration

// Export schemas and types
import {
  type Agent,
  AgentSchema,
  type AgentStatus,
  AgentStatusSchema,
  type AgentType,
  AgentTypeSchema,
  type ConnectionOptions,
  ConnectionOptionsSchema,
  type Message,
  MessageSchema,
  type MessageType,
  MessageTypeSchema,
  validateAgent,
  validateConnectionOptions,
  validateMessage,
  validatePartialAgent,
} from './schemas';

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

// For backward compatibility
// These exports are kept for backward compatibility but will be deprecated in future versions
export * from './types';
