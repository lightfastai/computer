import { type Agent, AgentStatus, type AgentType, type Message, MessageType } from './types';

/**
 * Base class for MCP agents
 */
export class MCPAgent implements Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];

  constructor(id: string, name: string, type: AgentType) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.status = AgentStatus.DISCONNECTED;
    this.capabilities = [];
  }

  /**
   * Connect to the agent
   */
  async connect(): Promise<boolean> {
    try {
      // Implementation will be specific to each agent type
      this.status = AgentStatus.CONNECTED;
      return true;
    } catch (error) {
      this.status = AgentStatus.ERROR;
      return false;
    }
  }

  /**
   * Disconnect from the agent
   */
  async disconnect(): Promise<boolean> {
    try {
      // Implementation will be specific to each agent type
      this.status = AgentStatus.DISCONNECTED;
      return true;
    } catch (error) {
      this.status = AgentStatus.ERROR;
      return false;
    }
  }

  /**
   * Send a message to the agent
   */
  async sendMessage(content: string, type: MessageType = MessageType.COMMAND): Promise<Message> {
    const message: Message = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      sender: 'lightfast',
      recipient: this.id,
      content,
      type,
    };

    // Implementation will be specific to each agent type

    return message;
  }
}
