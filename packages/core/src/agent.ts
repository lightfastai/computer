import { randomUUID } from 'node:crypto';
import type { Agent, AgentStatus, AgentType, Message, MessageType } from './schemas';

/**
 * Functional utilities for agent management
 */

/**
 * Create a new agent
 */
export const createAgent = (name: string, type: AgentType, id: string = randomUUID()): Agent => {
  return {
    id,
    name,
    type,
    status: 'disconnected',
    capabilities: [],
  };
};

/**
 * Set agent capabilities
 */
export const setCapabilities = (agent: Agent, capabilities: string[]): Agent => {
  return {
    ...agent,
    capabilities,
  };
};

/**
 * Connect an agent
 */
export const connectAgent = async (agent: Agent): Promise<Agent> => {
  try {
    // Implementation will be specific to each agent type in adapters
    return {
      ...agent,
      status: 'connected',
    };
  } catch (error) {
    return {
      ...agent,
      status: 'error',
    };
  }
};

/**
 * Disconnect an agent
 */
export const disconnectAgent = async (agent: Agent): Promise<Agent> => {
  try {
    // Implementation will be specific to each agent type in adapters
    return {
      ...agent,
      status: 'disconnected',
    };
  } catch (error) {
    return {
      ...agent,
      status: 'error',
    };
  }
};

/**
 * Update agent status
 */
export const updateAgentStatus = (agent: Agent, status: AgentStatus): Agent => {
  return {
    ...agent,
    status,
  };
};

/**
 * Create a message to send to an agent
 */
export const createMessage = (
  sender: string,
  recipient: string,
  content: string,
  type: MessageType = 'command',
): Message => {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    sender,
    recipient,
    content,
    type,
  };
};

/**
 * Send a message to an agent
 * This is a placeholder that would be implemented by specific adapters
 */
export const sendMessage = async (
  agent: Agent,
  content: string,
  type: MessageType = 'command',
): Promise<Message> => {
  const message = createMessage('lightfast', agent.id, content, type);

  // Implementation will be specific to each agent type in adapters

  return message;
};

/**
 * Check if an agent is connected
 */
export const isConnected = (agent: Agent): boolean => {
  return agent.status === 'connected';
};

/**
 * Check if an agent has an error
 */
export const hasError = (agent: Agent): boolean => {
  return agent.status === 'error';
};

/**
 * Check if an agent is disconnected
 */
export const isDisconnected = (agent: Agent): boolean => {
  return agent.status === 'disconnected';
};

/**
 * Check if an agent is busy
 */
export const isBusy = (agent: Agent): boolean => {
  return agent.status === 'busy';
};

/**
 * Check if an agent has a specific capability
 */
export const hasCapability = (agent: Agent, capability: string): boolean => {
  return agent.capabilities.includes(capability);
};
