# @lightfast/core

Core functionality for lightfast computer integration.

## Overview

This package provides the core functionality for the lightfast computer integration, including:

- Schema validation using Zod
- Functional utilities for agent management
- Functional utilities for communication between agents

## Installation

```bash
bun add @lightfast/core
```

## Usage

### Functional Approach (Recommended)

The core package now uses a functional approach with Zod schema validation:

```typescript
import {
  createAgent,
  createCommunicationState,
  registerAgent,
  sendMessage,
  validateAgent,
} from '@lightfast/core';

// Create an agent
const agent = createAgent('BlenderMain', 'blender');

// Validate the agent with Zod
const validatedAgent = validateAgent(agent);

// Create a communication state
let state = createCommunicationState();

// Register the agent with the communication state
state = registerAgent(state, agent);

// Send a message to the agent
const message = await sendMessage(state, agent.id, 'Hello, Blender!');
```

### Zod Schema Validation

You can use Zod schemas for validation:

```typescript
import { AgentSchema, validateAgent } from '@lightfast/core';
import { z } from 'zod';

// Define a custom agent schema with additional validation
const CustomAgentSchema = AgentSchema.extend({
  name: z.string().min(3).max(50),
});

try {
  // Create an agent
  const agent = createAgent('TD', 'touchdesigner');
  
  // Validate with the custom schema
  const validatedAgent = CustomAgentSchema.parse(agent);
  console.log('Custom validation passed:', validatedAgent);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Custom validation failed:', error.errors);
  }
}
```

### Class-based Approach (Legacy)

For backward compatibility, the class-based approach is still supported:

```typescript
import { AgentType, CommunicationManager, MCPAgent } from '@lightfast/core';

// Create an agent
const agent = new MCPAgent('agent-id', 'BlenderMain', AgentType.BLENDER);

// Create a communication manager
const manager = new CommunicationManager();

// Register the agent
manager.registerAgent(agent);

// Send a message to the agent
const message = await manager.sendMessage(agent.id, 'Hello, Blender!');
```

## API Reference

### Schemas

- `AgentSchema`: Zod schema for agents
- `MessageSchema`: Zod schema for messages
- `ConnectionOptionsSchema`: Zod schema for connection options

### Agent Functions

- `createAgent`: Create a new agent
- `connectAgent`: Connect an agent
- `disconnectAgent`: Disconnect an agent
- `sendMessage`: Send a message to an agent
- `createMessage`: Create a message
- `setCapabilities`: Set agent capabilities
- `updateAgentStatus`: Update agent status

### Communication Functions

- `createCommunicationState`: Create a new communication state
- `registerAgent`: Register an agent with a communication state
- `unregisterAgent`: Unregister an agent from a communication state
- `getAgents`: Get all registered agents
- `getAgent`: Get an agent by ID
- `sendMessage`: Send a message to an agent
- `onMessage`: Register a message handler
- `handleMessage`: Handle an incoming message

### Validation Functions

- `validateAgent`: Validate an agent
- `validateMessage`: Validate a message
- `validateConnectionOptions`: Validate connection options
- `validatePartialAgent`: Validate a partial agent for updates
