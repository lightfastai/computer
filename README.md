# Lightfast Computer

A terminal-based integration layer for creative software like Blender, Ableton Live, and TouchDesigner using MCP agents.

## Overview

Lightfast Computer provides a unified interface for controlling and coordinating different creative software applications. It uses a modular architecture with adapters for each supported software and a central communication system to enable cross-application workflows.

## Features

- Terminal-based UI using Ink.js
- Support for Blender, Ableton Live, and TouchDesigner
- Extensible adapter system for adding new software integrations
- Real-time communication between different applications
- Context-aware command system

## Project Structure

```
packages/
  ├── core/             # Core functionality and types
  ├── cli/              # Terminal UI using Ink.js
  └── adapters/         # Software-specific adapters
      ├── blender/      # Blender integration
      ├── ableton/      # Ableton Live integration
      └── touchdesigner/ # TouchDesigner integration
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
