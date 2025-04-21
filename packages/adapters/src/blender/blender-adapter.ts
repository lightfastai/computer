/**
 * Functional utilities for Blender adapter
 */
import { randomUUID } from 'node:crypto';
import {
  type Agent,
  type Message,
  type MessageType,
  createAgent,
  createMessage,
  setCapabilities,
  updateAgentStatus,
  validateAgent,
} from '@lightfast/core';

/**
 * Blender connection options
 */
export interface BlenderConnectionOptions {
  host: string;
  port: number;
}

/**
 * Create a Blender agent with default capabilities
 */
export const createBlenderAgent = (
  name: string,
  options: BlenderConnectionOptions = { host: 'localhost', port: 8080 },
  id: string = randomUUID(),
): Agent => {
  // Create a base agent
  const agent = createAgent(name, 'blender', id);
  
  // Add Blender-specific capabilities
  return setCapabilities(agent, [
    'scene-management',
    'object-manipulation',
    'rendering',
    'animation',
    'scripting',
  ]);
};

/**
 * Connect to a Blender instance
 */
export const connectBlender = async (
  agent: Agent,
  options: BlenderConnectionOptions = { host: 'localhost', port: 8080 },
): Promise<Agent> => {
  try {
    // Implementation would connect to Blender via Python API or other method
    console.log(`Connecting to Blender at ${options.host}:${options.port}`);

    // For now, just simulate a successful connection
    return updateAgentStatus(agent, 'connected');
  } catch (error) {
    console.error('Failed to connect to Blender:', error);
    return updateAgentStatus(agent, 'error');
  }
};

/**
 * Disconnect from a Blender instance
 */
export const disconnectBlender = async (
  agent: Agent,
  options: BlenderConnectionOptions = { host: 'localhost', port: 8080 },
): Promise<Agent> => {
  try {
    // Implementation would disconnect from Blender
    console.log(`Disconnecting from Blender at ${options.host}:${options.port}`);

    // For now, just simulate a successful disconnection
    return updateAgentStatus(agent, 'disconnected');
  } catch (error) {
    console.error('Failed to disconnect from Blender:', error);
    return updateAgentStatus(agent, 'error');
  }
};

/**
 * Send a message to a Blender instance
 */
export const sendBlenderMessage = async (
  agent: Agent,
  content: string,
  type: MessageType = 'command',
): Promise<Message> => {
  // Validate the agent
  validateAgent(agent);
  
  // Create the message
  const message = createMessage('lightfast', agent.id, content, type);

  try {
    // Implementation would send the message to Blender
    console.log(`Sending message to Blender: ${content}`);

    // For now, just log the message
    return message;
  } catch (error) {
    console.error('Failed to send message to Blender:', error);
    return {
      ...message,
      type: 'error',
      content: `Error: ${error}`,
    };
  }
};
