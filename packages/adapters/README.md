# @lightfast/adapters

Adapters for lightfast computer integration.

## Overview

This package provides adapters for integrating with various creative software applications:

- Blender
- Ableton Live
- TouchDesigner

Each adapter provides functional utilities for creating agents, connecting to software instances, and sending messages.

## Installation

```bash
bun add @lightfast/adapters
```

## Usage

### Blender Adapter

```typescript
import {
  createBlenderAgent,
  connectBlender,
  disconnectBlender,
  sendBlenderMessage,
} from '@lightfast/adapters/blender';

// Create a Blender agent
const blenderAgent = createBlenderAgent('BlenderMain', { host: 'localhost', port: 8080 });

// Connect to Blender
const connectedAgent = await connectBlender(blenderAgent);

// Send a message to Blender
const message = await sendBlenderMessage(connectedAgent, 'create sphere');

// Disconnect from Blender
const disconnectedAgent = await disconnectBlender(connectedAgent);
```

### Ableton Adapter

```typescript
import {
  createAbletonAgent,
  connectAbleton,
  disconnectAbleton,
  sendAbletonMessage,
} from '@lightfast/adapters/ableton';

// Create an Ableton agent
const abletonAgent = createAbletonAgent('AbletonMain', { host: 'localhost', port: 9000 });

// Connect to Ableton
const connectedAgent = await connectAbleton(abletonAgent);

// Send a message to Ableton
const message = await sendAbletonMessage(connectedAgent, 'play track 1');

// Disconnect from Ableton
const disconnectedAgent = await disconnectAbleton(connectedAgent);
```

### TouchDesigner Adapter

```typescript
import {
  createTouchDesignerAgent,
  connectTouchDesigner,
  disconnectTouchDesigner,
  sendTouchDesignerMessage,
} from '@lightfast/adapters/touchdesigner';

// Create a TouchDesigner agent
const tdAgent = createTouchDesignerAgent('TouchDesignerMain', { host: 'localhost', port: 7000 });

// Connect to TouchDesigner
const connectedAgent = await connectTouchDesigner(tdAgent);

// Send a message to TouchDesigner
const message = await sendTouchDesignerMessage(connectedAgent, 'set parameter value');

// Disconnect from TouchDesigner
const disconnectedAgent = await disconnectTouchDesigner(connectedAgent);
```

### Using with Communication State

You can use the adapters with the communication state from the core package:

```typescript
import {
  createCommunicationState,
  registerAgent,
  communicationSendMessage,
} from '@lightfast/core';
import { createBlenderAgent, connectBlender } from '@lightfast/adapters/blender';

// Create a communication state
let state = createCommunicationState();

// Create and connect a Blender agent
const blenderAgent = createBlenderAgent('BlenderMain');
const connectedAgent = await connectBlender(blenderAgent);

// Register the agent with the communication state
state = registerAgent(state, connectedAgent);

// Send a message to the agent through the communication state
const message = await communicationSendMessage(state, connectedAgent.id, 'create cube');
```

## API Reference

### Blender Adapter

- `createBlenderAgent`: Create a Blender agent
- `connectBlender`: Connect to a Blender instance
- `disconnectBlender`: Disconnect from a Blender instance
- `sendBlenderMessage`: Send a message to a Blender instance

### Ableton Adapter

- `createAbletonAgent`: Create an Ableton agent
- `connectAbleton`: Connect to an Ableton instance
- `disconnectAbleton`: Disconnect from an Ableton instance
- `sendAbletonMessage`: Send a message to an Ableton instance

### TouchDesigner Adapter

- `createTouchDesignerAgent`: Create a TouchDesigner agent
- `connectTouchDesigner`: Connect to a TouchDesigner instance
- `disconnectTouchDesigner`: Disconnect from a TouchDesigner instance
- `sendTouchDesignerMessage`: Send a message to a TouchDesigner instance
