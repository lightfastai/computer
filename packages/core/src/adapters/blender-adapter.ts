/**
 * Blender adapter implementation - Functional approach
 */
import { randomUUID } from 'node:crypto';
import * as net from 'node:net';
import { createAgent, createMessage, setCapabilities, updateAgentStatus } from '../agent';
import type { Agent } from '../schema/agent';
import type { Message } from '../schema/message';
import type { MessageType } from '../schema/message-type';
import { validateAgent } from '../schema/schemas';

/**
 * Blender connection options
 */
export interface BlenderConnectionOptions {
  host: string;
  port: number;
  timeout?: number;
}

/**
 * Blender command response
 */
export interface BlenderCommandResponse {
  status: 'success' | 'error';
  result?: Record<string, unknown>;
  message?: string;
}

/**
 * Blender connection state
 */
export interface BlenderConnectionState {
  host: string;
  port: number;
  socket: net.Socket | null;
  timeout: number;
  connected: boolean;
  buffer: string;
  responseCallbacks: Map<string, (response: BlenderCommandResponse) => void>;
  commandId: number;
}

/**
 * Create a new Blender connection state
 */
export const createBlenderConnectionState = (
  options: BlenderConnectionOptions,
): BlenderConnectionState => {
  return {
    host: options.host,
    port: options.port,
    socket: null,
    timeout: options.timeout || 15000, // Default 15 seconds timeout
    connected: false,
    buffer: '',
    responseCallbacks: new Map(),
    commandId: 0,
  };
};

/**
 * Connect to Blender
 */
export const connectToBlender = (
  state: BlenderConnectionState,
): Promise<BlenderConnectionState> => {
  return new Promise((resolve, reject) => {
    if (state.connected) {
      return resolve(state);
    }

    try {
      const socket = new net.Socket();
      const newState = { ...state, socket };

      socket.on('connect', () => {
        console.log(`Connected to Blender at ${state.host}:${state.port}`);
        resolve({ ...newState, connected: true });
      });

      socket.on('data', (data) => {
        const updatedState = handleBlenderData(newState, data);
        Object.assign(newState, updatedState);
      });

      socket.on('error', (error) => {
        console.error(`Blender connection error: ${error.message}`);
        reject(error);
      });

      socket.on('close', () => {
        console.log('Blender connection closed');
        newState.connected = false;
      });

      socket.connect(state.port, state.host);
    } catch (error) {
      console.error(`Failed to connect to Blender: ${error}`);
      reject(error);
    }
  });
};

/**
 * Handle incoming data from Blender
 */
export const handleBlenderData = (
  state: BlenderConnectionState,
  data: Buffer,
): BlenderConnectionState => {
  const chunk = data.toString('utf-8');
  const newBuffer = state.buffer + chunk;
  const newState = { ...state, buffer: newBuffer };

  try {
    // Try to parse the buffer as JSON
    const response = JSON.parse(newBuffer);

    // Check if this is a response to a command
    if (response.id && state.responseCallbacks.has(response.id)) {
      const callback = state.responseCallbacks.get(response.id);
      if (callback) {
        callback(response);
        state.responseCallbacks.delete(response.id);
      }
    }

    // Clear the buffer after successful parsing
    newState.buffer = '';
  } catch (error) {
    // If we can't parse the buffer as JSON, it might be incomplete
    // We'll wait for more data
  }

  return newState;
};

/**
 * Disconnect from Blender
 */
export const disconnectFromBlender = (state: BlenderConnectionState): BlenderConnectionState => {
  if (state.socket) {
    state.socket.end();
    return { ...state, socket: null, connected: false };
  }
  return state;
};

/**
 * Send a command to Blender
 */
export const sendBlenderCommand = (
  state: BlenderConnectionState,
  commandType: string,
  params: Record<string, unknown> = {},
): Promise<BlenderCommandResponse> => {
  return new Promise((resolve, reject) => {
    if (!state.connected) {
      return reject(new Error('Not connected to Blender'));
    }

    const commandId = `cmd_${state.commandId}`;
    const newState = { ...state, commandId: state.commandId + 1 };

    const command = {
      id: commandId,
      type: commandType,
      params: params,
    };

    // Set up a timeout for the command
    const timeoutId = setTimeout(() => {
      newState.responseCallbacks.delete(commandId);
      reject(new Error(`Command timeout: ${commandType}`));
    }, state.timeout);

    // Set up a callback for the response
    newState.responseCallbacks.set(commandId, (response) => {
      clearTimeout(timeoutId);
      resolve(response);
    });

    // Send the command
    try {
      state.socket?.write(`${JSON.stringify(command)}\n`);
    } catch (error) {
      clearTimeout(timeoutId);
      newState.responseCallbacks.delete(commandId);
      reject(error);
    }
  });
};

/**
 * Get scene information
 */
export const getSceneInfo = (state: BlenderConnectionState): Promise<BlenderCommandResponse> => {
  return sendBlenderCommand(state, 'get_scene_info');
};

/**
 * Get object information
 */
export const getObjectInfo = (
  state: BlenderConnectionState,
  objectName: string,
): Promise<BlenderCommandResponse> => {
  return sendBlenderCommand(state, 'get_object_info', { name: objectName });
};

/**
 * Execute Python code in Blender
 */
export const executeCode = (
  state: BlenderConnectionState,
  code: string,
): Promise<BlenderCommandResponse> => {
  return sendBlenderCommand(state, 'execute_code', { code });
};

// Global connection state
let _blenderConnectionState: BlenderConnectionState | null = null;

/**
 * Get or create a Blender connection state
 */
export const getBlenderConnectionState = (
  options: BlenderConnectionOptions = { host: 'localhost', port: 9876 },
): BlenderConnectionState => {
  if (_blenderConnectionState) {
    return _blenderConnectionState;
  }

  _blenderConnectionState = createBlenderConnectionState(options);
  return _blenderConnectionState;
};

/**
 * Create a Blender agent with default capabilities
 */
export const createBlenderAgent = (
  name: string,
  options: BlenderConnectionOptions = { host: 'localhost', port: 9876 },
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
  options: BlenderConnectionOptions = { host: 'localhost', port: 9876 },
): Promise<Agent> => {
  try {
    const state = getBlenderConnectionState(options);
    await connectToBlender(state);
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
  options: BlenderConnectionOptions = { host: 'localhost', port: 9876 },
): Promise<Agent> => {
  try {
    const state = getBlenderConnectionState(options);
    disconnectFromBlender(state);
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
    const state = getBlenderConnectionState();

    // Parse the content as a command
    let commandType: string;
    let params: Record<string, unknown> = {};

    try {
      const commandData = JSON.parse(content);
      commandType = commandData.type;
      params = commandData.params || {};
    } catch (error) {
      // If the content is not valid JSON, treat it as a command type
      commandType = content;
    }

    // Send the command to Blender
    const response = await sendBlenderCommand(state, commandType, params);

    // Return a response message
    return {
      ...message,
      type: response.status === 'success' ? 'response' : 'error',
      content: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Failed to send message to Blender:', error);
    return {
      ...message,
      type: 'error',
      content: `Error: ${error}`,
    };
  }
};
