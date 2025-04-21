import { sendMessage as sendAgentMessage } from './agent';
import type { Agent } from './schema/agent';
import type { Message } from './schema/message';
import type { MessageType } from './schema/message-type';

/**
 * Functional communication utilities
 */

// Type for the communication state
export interface CommunicationState {
  agents: Map<string, Agent>;
  messageHandlers: Map<string, ((message: Message) => void)[]>;
}

/**
 * Create a new communication state
 */
export const createCommunicationState = (): CommunicationState => {
  return {
    agents: new Map(),
    messageHandlers: new Map(),
  };
};

/**
 * Register a new agent
 */
export const registerAgent = (state: CommunicationState, agent: Agent): CommunicationState => {
  const newState = { ...state };
  newState.agents = new Map(state.agents);
  newState.agents.set(agent.id, agent);
  return newState;
};

/**
 * Unregister an agent
 */
export const unregisterAgent = (state: CommunicationState, agentId: string): CommunicationState => {
  const newState = { ...state };
  newState.agents = new Map(state.agents);
  newState.agents.delete(agentId);
  return newState;
};

/**
 * Get all registered agents
 */
export const getAgents = (state: CommunicationState): Agent[] => {
  return Array.from(state.agents.values());
};

/**
 * Get an agent by ID
 */
export const getAgent = (state: CommunicationState, agentId: string): Agent | undefined => {
  return state.agents.get(agentId);
};

/**
 * Send a message to an agent
 */
export const sendMessage = async (
  state: CommunicationState,
  agentId: string,
  content: string,
  type: MessageType = 'command',
): Promise<Message | null> => {
  const agent = state.agents.get(agentId);
  if (!agent) {
    return null;
  }

  return sendAgentMessage(agent, content, type);
};

/**
 * Register a message handler
 */
export const onMessage = (
  state: CommunicationState,
  agentId: string,
  handler: (message: Message) => void,
): CommunicationState => {
  const newState = { ...state };
  newState.messageHandlers = new Map(state.messageHandlers);

  if (!newState.messageHandlers.has(agentId)) {
    newState.messageHandlers.set(agentId, []);
  }

  const handlers = newState.messageHandlers.get(agentId) || [];
  newState.messageHandlers.set(agentId, [...handlers, handler]);

  return newState;
};

/**
 * Handle an incoming message
 */
export const handleMessage = (state: CommunicationState, message: Message): void => {
  const handlers = state.messageHandlers.get(message.sender);
  if (handlers) {
    for (const handler of handlers) {
      handler(message);
    }
  }
};
