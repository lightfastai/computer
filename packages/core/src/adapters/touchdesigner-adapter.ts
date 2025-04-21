/**
 * Functional utilities for TouchDesigner adapter
 */
import { randomUUID } from 'node:crypto';

import { createAgent, createMessage, setCapabilities, updateAgentStatus } from '../agent';
import type { Agent } from '../schema/agent';
import type { Message } from '../schema/message';
import type { MessageType } from '../schema/message-type';
import { validateAgent } from '../schema/schemas';

/**
 * TouchDesigner connection options
 */
export interface TouchDesignerConnectionOptions {
  host: string;
  port: number;
}

/**
 * Create a TouchDesigner agent with default capabilities
 */
export const createTouchDesignerAgent = (
  name: string,
  options: TouchDesignerConnectionOptions = { host: 'localhost', port: 7000 },
  id: string = randomUUID(),
): Agent => {
  // Create a base agent
  const agent = createAgent(name, 'touchdesigner', id);

  // Add TouchDesigner-specific capabilities
  return setCapabilities(agent, [
    'parameter-control',
    'node-creation',
    'texture-manipulation',
    'real-time-rendering',
    'osc-communication',
  ]);
};

/**
 * Connect to a TouchDesigner instance
 */
export const connectTouchDesigner = async (
  agent: Agent,
  options: TouchDesignerConnectionOptions = { host: 'localhost', port: 7000 },
): Promise<Agent> => {
  try {
    // Implementation would connect to TouchDesigner via Python or OSC
    console.log(`Connecting to TouchDesigner at ${options.host}:${options.port}`);

    // For now, just simulate a successful connection
    return updateAgentStatus(agent, 'connected');
  } catch (error) {
    console.error('Failed to connect to TouchDesigner:', error);
    return updateAgentStatus(agent, 'error');
  }
};

/**
 * Disconnect from a TouchDesigner instance
 */
export const disconnectTouchDesigner = async (
  agent: Agent,
  options: TouchDesignerConnectionOptions = { host: 'localhost', port: 7000 },
): Promise<Agent> => {
  try {
    // Implementation would disconnect from TouchDesigner
    console.log(`Disconnecting from TouchDesigner at ${options.host}:${options.port}`);

    // For now, just simulate a successful disconnection
    return updateAgentStatus(agent, 'disconnected');
  } catch (error) {
    console.error('Failed to disconnect from TouchDesigner:', error);
    return updateAgentStatus(agent, 'error');
  }
};

/**
 * Send a message to a TouchDesigner instance
 */
export const sendTouchDesignerMessage = async (
  agent: Agent,
  content: string,
  type: MessageType = 'command',
): Promise<Message> => {
  // Validate the agent
  validateAgent(agent);

  // Create the message
  const message = createMessage('lightfast', agent.id, content, type);

  try {
    // Implementation would send the message to TouchDesigner
    console.log(`Sending message to TouchDesigner: ${content}`);

    // For now, just log the message
    return message;
  } catch (error) {
    console.error('Failed to send message to TouchDesigner:', error);
    return {
      ...message,
      type: 'error',
      content: `Error: ${error}`,
    };
  }
};
