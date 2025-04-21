/**
 * Functional utilities for Ableton adapter
 */
import { randomUUID } from 'node:crypto';
import { createAgent, createMessage, setCapabilities, updateAgentStatus } from '../agent';
import type { Agent } from '../schema/agent';
import type { Message } from '../schema/message';
import type { MessageType } from '../schema/message-type';
import { validateAgent } from '../schema/schemas';

/**
 * Ableton connection options
 */
export interface AbletonConnectionOptions {
  host: string;
  port: number;
}

/**
 * Create an Ableton agent with default capabilities
 */
export const createAbletonAgent = (
  name: string,
  options: AbletonConnectionOptions = { host: 'localhost', port: 9000 },
  id: string = randomUUID(),
): Agent => {
  // Create a base agent
  const agent = createAgent(name, 'ableton', id);

  // Add Ableton-specific capabilities
  return setCapabilities(agent, [
    'track-control',
    'clip-launching',
    'device-parameters',
    'transport-control',
    'midi-mapping',
  ]);
};

/**
 * Connect to an Ableton instance
 */
export const connectAbleton = async (
  agent: Agent,
  options: AbletonConnectionOptions = { host: 'localhost', port: 9000 },
): Promise<Agent> => {
  try {
    // Implementation would connect to Ableton via MIDI or OSC
    console.log(`Connecting to Ableton at ${options.host}:${options.port}`);

    // For now, just simulate a successful connection
    return updateAgentStatus(agent, 'connected');
  } catch (error) {
    console.error('Failed to connect to Ableton:', error);
    return updateAgentStatus(agent, 'error');
  }
};

/**
 * Disconnect from an Ableton instance
 */
export const disconnectAbleton = async (
  agent: Agent,
  options: AbletonConnectionOptions = { host: 'localhost', port: 9000 },
): Promise<Agent> => {
  try {
    // Implementation would disconnect from Ableton
    console.log(`Disconnecting from Ableton at ${options.host}:${options.port}`);

    // For now, just simulate a successful disconnection
    return updateAgentStatus(agent, 'disconnected');
  } catch (error) {
    console.error('Failed to disconnect from Ableton:', error);
    return updateAgentStatus(agent, 'error');
  }
};

/**
 * Send a message to an Ableton instance
 */
export const sendAbletonMessage = async (
  agent: Agent,
  content: string,
  type: MessageType = 'command',
): Promise<Message> => {
  // Validate the agent
  validateAgent(agent);

  // Create the message
  const message = createMessage('lightfast', agent.id, content, type);

  try {
    // Implementation would send the message to Ableton
    console.log(`Sending message to Ableton: ${content}`);

    // For now, just log the message
    return message;
  } catch (error) {
    console.error('Failed to send message to Ableton:', error);
    return {
      ...message,
      type: 'error',
      content: `Error: ${error}`,
    };
  }
};
