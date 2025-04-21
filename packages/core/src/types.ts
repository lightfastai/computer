/**
 * Types for the lightfast computer integration
 */

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];
}

export enum AgentType {
  BLENDER = 'blender',
  ABLETON = 'ableton',
  TOUCHDESIGNER = 'touchdesigner',
}

export enum AgentStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  BUSY = 'busy',
  ERROR = 'error',
}

export interface Message {
  id: string;
  timestamp: number;
  sender: string;
  recipient: string;
  content: string;
  type: MessageType;
}

export enum MessageType {
  COMMAND = 'command',
  RESPONSE = 'response',
  EVENT = 'event',
  ERROR = 'error',
}

export interface ConnectionOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  timeout?: number;
}
