# Lightfast Computer

A terminal-based integration layer for creative software like Blender, Ableton Live, and TouchDesigner using a functional approach with Zod validation.

## Overview

Lightfast Computer provides a unified interface for controlling and coordinating different creative software applications. It uses a modular architecture with adapters for each supported software and a central communication system to enable cross-application workflows.

## Features

- Terminal-based UI using Ink.js
- Support for Blender, Ableton Live, and TouchDesigner
- Extensible adapter system for adding new software integrations
- Real-time communication between different applications
- Context-aware command system
- Functional programming approach with immutable data
- Strong type validation using Zod schemas

## Project Structure

```
packages/
  ├── core/             # Core functionality, schemas, and types
  │   ├── schemas.ts    # Zod schemas for validation
  │   ├── agent.ts      # Functional agent utilities
  │   └── communication.ts # Functional communication utilities
  ├── adapters/         # Software-specific adapters
  │   ├── blender/      # Blender integration
  │   ├── ableton/      # Ableton Live integration
  │   └── touchdesigner/ # TouchDesigner integration
  └── cli/              # Terminal UI using Ink.js
examples/
  └── functional-example.ts # Example of using the functional approach
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.0.25 or higher

### Installation

```bash
# Install dependencies
./install.sh

# Build all packages
bun run build
```

### Running the CLI

```bash
# Start the CLI
bun run dev
```

## Core Package

The core package has been refactored to use a functional approach with Zod validation:

```typescript
// Create an agent
const agent = createAgent('BlenderMain', 'blender');

// Validate the agent with Zod
const validatedAgent = validateAgent(agent);

// Create a communication state
let state = createCommunicationState();

// Register the agent with the communication state
state = registerAgent(state, agent);

// Send a message to the agent
const message = await communicationSendMessage(state, agent.id, 'Hello, Blender!');
```

See the [Core Package README](packages/core/README.md) for more details.

## Development

This project uses [Turborepo](https://turbo.build/) for optimized builds and better caching.

```bash
# Format code
bun run format

# Lint code
bun run lint

# Run tests
bun run test

# Clean all build artifacts and node_modules
bun run clean
```

### Turborepo Features

- Incremental builds - only rebuild what changed
- Content-aware hashing - only rebuild when content changes, not timestamps
- Parallel execution - run tasks across packages in parallel
- Remote caching - share build caches with your team or CI/CD
- Task pipelines - define dependencies between tasks
- Pruned subsets - run tasks only for packages that have changed

### Filtering Builds

You can use Turborepo's filtering to build specific packages:

```bash
# Build only the core package
turbo build --filter=@lightfast/core

# Build the CLI and its dependencies
turbo build --filter=@lightfast/cli...

# Build all adapter packages
turbo build --filter=./packages/adapters/*
```

## License

MIT
