# lightfast-computer

A simplified Fly.io instance management system for creating Ubuntu sandboxes with GitHub integration and command execution capabilities.

## Overview

This project provides a streamlined API for:
- Creating Fly.io Ubuntu instances with GitHub access
- Executing commands on instances with real-time streaming
- Managing instance lifecycle (create, start, stop, destroy)
- Cloning and working with Git repositories in isolated environments

## Key Features

### 1. **GitHub Integration**
- Secure GitHub token injection into instances
- Automatic repository cloning on instance creation
- Pre-configured Git authentication

### 2. **Command Execution with Streaming**
- Real-time command output via Server-Sent Events (SSE)
- Security-restricted command whitelist
- Command history tracking

### 3. **Simplified Architecture**
- Direct API calls (no event-driven complexity)
- Functional programming with Result types
- In-memory state management

## Quick Start

### Create an Instance with GitHub Access

```bash
curl -X POST http://localhost:3000/api/instances \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dev-sandbox",
    "size": "shared-cpu-2x",
    "memoryMb": 1024,
    "secrets": {
      "githubToken": "ghp_YOUR_TOKEN",
      "githubUsername": "your-username"
    },
    "repoUrl": "https://github.com/your-org/your-repo.git"
  }'
```

### Execute Commands with Streaming

```bash
curl -X POST http://localhost:3000/api/commands/{instanceId}/exec \
  -H "Content-Type: application/json" \
  -d '{
    "command": "ls",
    "args": ["-la", "/workspace"],
    "timeout": 30000
  }'
```

The response streams output in real-time using Server-Sent Events.

### View Command History

```bash
curl http://localhost:3000/api/commands/{instanceId}/history
```

## API Endpoints

### Instance Management
- `POST /api/instances` - Create new instance
- `GET /api/instances` - List all instances
- `GET /api/instances/:id` - Get instance details
- `POST /api/instances/:id/start` - Start instance
- `POST /api/instances/:id/stop` - Stop instance
- `POST /api/instances/:id/restart` - Restart instance
- `DELETE /api/instances/:id` - Destroy instance
- `GET /api/instances/:id/health` - Health check
- `GET /api/instances/stats/summary` - Instance statistics

### Command Execution
- `POST /api/commands/:instanceId/exec` - Execute command with streaming
- `GET /api/commands/:instanceId/history` - Get command history

### Monitoring
- `GET /api/monitoring/health` - API health check

## Security

### Command Restrictions
Only the following commands are allowed for security:
- `ls`, `grep`, `find`, `cat`, `echo`
- `pwd`, `env`, `ps`, `df`, `du`

### GitHub Token Security
- Tokens are injected as Fly.io app secrets
- Never logged or exposed in API responses
- Configured via Git URL rewriting for HTTPS authentication

## Architecture

### Technology Stack
- **Hono**: Lightweight web framework
- **Bun**: Fast runtime and package manager
- **Fly.io Machines API**: Ubuntu instance provisioning
- **Vercel AI SDK**: Command streaming infrastructure
- **neverthrow**: Functional error handling with Result types

### Design Principles
- **Functional Programming**: No classes, pure functions only
- **Direct API Calls**: Simplified synchronous operations
- **Type Safety**: Strict TypeScript with Zod validation
- **Error Handling**: Result types for all operations

## Development

### Prerequisites
- Bun 1.x
- Fly.io account and API token
- GitHub Personal Access Token (for GitHub features)

### Setup

```bash
# Install dependencies
bun install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your tokens

# Run development server
bun dev

# Run tests
bun test --watch
```

### Environment Variables

```env
# Required
FLY_API_TOKEN=your_fly_api_token
FLY_ORG_SLUG=your_fly_org

# Optional
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

## Examples

See the `examples/` directory for complete examples:
- `create-instance-with-github.ts` - Creating instances with GitHub access
- `command-streaming.ts` - Executing commands with real-time streaming

## Deployment

```bash
# Deploy to Fly.io
fly deploy

# Check deployment
fly status
fly logs
```

## License

MIT
