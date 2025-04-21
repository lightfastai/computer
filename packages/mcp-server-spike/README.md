# Lightfast MCP Server Spike

A simple implementation of a Model Context Protocol (MCP) server and client for testing and demonstration purposes.

## Overview

This package provides:

1. A simple MCP server with:
   - Resources (system information and dynamic greetings)
   - Tools (calculator)
   - Prompts (code review)

2. Both stdio and HTTP transport options
3. A simple client for testing the server

## Installation

```bash
# Install dependencies
bun install
```

## Building

```bash
# Build the package
bun run build
```

## Running the Server

### Using stdio Transport

```bash
# Start the server with stdio transport
bun run start:stdio
```

### Using HTTP Transport

```bash
# Start the server with HTTP transport
bun run start:http
```

The server will listen on port 3000 by default. You can change the port by setting the `PORT` environment variable.

## Testing with the Client

```bash
# Test with stdio transport
bun run dist/client.js stdio

# Test with HTTP transport
bun run dist/client.js http http://localhost:3000/mcp
```

## Features

### Resources

- `system://info` - Returns system information
- `greeting://{name}` - Returns a greeting with the specified name

### Tools

- `calculate` - Performs basic arithmetic operations (add, subtract, multiply, divide)

### Prompts

- `review-code` - Generates a prompt for code review

## Architecture

This implementation follows the Model Context Protocol specification, providing a standardized way for LLMs to interact with applications. The server exposes data through resources, functionality through tools, and interaction patterns through prompts.

## License

MIT
