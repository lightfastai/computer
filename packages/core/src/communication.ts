import type { MCPAgent } from './agent';
import { type Message, MessageType } from './types';

/**
 * Manages communication between different agents
 */
export class CommunicationManager {
  private agents: Map<string, MCPAgent>;
  private messageHandlers: Map<string, ((message: Message) => void)[]>;

  constructor() {
    this.agents = new Map();
    this.messageHandlers = new Map();
  }

  /**
   * Register a new agent
   */
  registerAgent(agent: MCPAgent): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  /**
   * Get all registered agents
   */
  getAgents(): MCPAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): MCPAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Send a message to an agent
   */
  async sendMessage(
    agentId: string,
    content: string,
    type: MessageType = MessageType.COMMAND
  ): Promise<Message | null> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    return agent.sendMessage(content, type);
  }

  /**
   * Register a message handler
   */
  onMessage(agentId: string, handler: (message: Message) => void): void {
    if (!this.messageHandlers.has(agentId)) {
      this.messageHandlers.set(agentId, []);
    }

    this.messageHandlers.get(agentId)?.push(handler);
  }

  /**
   * Handle an incoming message
   */
  handleMessage(message: Message): void {
    const handlers = this.messageHandlers.get(message.sender);
    if (handlers) {
      for (const handler of handlers) {
        handler(message);
      }
    }
  }
}
