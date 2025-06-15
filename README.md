# Fly.io Workflow Orchestrator

A generalized workflow management system for creating and orchestrating Fly.io Ubuntu instances with SSH command execution capabilities.

## Overview

This project provides a flexible interface for:
- Creating Fly.io Ubuntu machine instances on-demand
- Executing SSH commands on those instances
- Building complex, application-specific workflows
- Managing development environments in the cloud

## Use Cases

### Primary Use Case
Rebuilding Manus AI's computer infrastructure with cloud-based development environments.

### General Use Cases
- Remote development environments
- CI/CD pipeline execution
- Distributed task processing
- Isolated testing environments
- Automated workflow execution

## Example Workflow

```bash
# User workflow example:
1. Create Ubuntu instance on Fly.io
2. SSH into instance
3. git clone repository
4. Make code changes
5. Run tests
6. git commit and push
7. Destroy instance (optional)
```

## Architecture

The system consists of:
- **API Server**: Hono-based REST API for managing instances and executing commands
- **Fly.io Integration**: Machine creation and management via Fly.io API
- **SSH Client**: Secure command execution on remote instances
- **Workflow Engine**: Orchestration of complex multi-step workflows
- **Frontend (Optional)**: Web interface for workflow management

## Features

- **Instance Management**: Create, list, and destroy Fly.io Ubuntu instances
- **Command Execution**: Run arbitrary SSH commands on instances
- **Workflow Templates**: Pre-defined workflows for common tasks
- **Session Management**: Maintain state across command executions
- **Security**: Secure SSH key management and connection handling
- **Extensibility**: Plugin system for custom workflow steps

## Tech Stack

- **Backend**: Hono (lightweight web framework)
- **Infrastructure**: Fly.io machines
- **Language**: TypeScript/Node.js
- **SSH**: Node SSH libraries for secure connections
- **Database**: SQLite/PostgreSQL for workflow state (TBD)

## Getting Started

## Prerequisites

- [Bun](https://bun.sh/) runtime
- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) (`brew install flyctl`)
- Fly.io account and API token

## Setup

```bash
# Clone the repository
git clone https://github.com/lightfastai/computer.git
cd computer

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your Fly.io API token and configuration

# Login to Fly.io
fly auth login

# Run development server
bun dev
```

## Deployment

This project is configured to deploy to the `lightfast` organization on Fly.io.

```bash
# Deploy to Fly.io (uses fly.toml configuration)
fly deploy

# View deployment logs
fly logs

# SSH into the deployed instance
fly ssh console

# Scale the application
fly scale count 1
```

### Fly.io Configuration

The application is configured in `fly.toml`:
- **App Name**: `lightfast-workflow-orchestrator`
- **Organization**: `lightfast`
- **Primary Region**: `iad` (US East)
- **Auto-scaling**: Enabled with auto-stop/start
- **Health Checks**: Configured on `/health` endpoint

## API Endpoints

### Instance Management
- `POST /instances` - Create new Ubuntu instance
- `GET /instances` - List all instances
- `GET /instances/:id` - Get instance details
- `DELETE /instances/:id` - Destroy instance

### Command Execution
- `POST /instances/:id/exec` - Execute command on instance
- `GET /instances/:id/sessions` - List active sessions
- `WebSocket /instances/:id/shell` - Interactive shell session

### Workflow Management
- `POST /workflows` - Create new workflow
- `GET /workflows` - List workflows
- `POST /workflows/:id/run` - Execute workflow
- `GET /workflows/:id/status` - Get workflow execution status

## Configuration

```typescript
// Example configuration
{
  "fly": {
    "apiToken": "YOUR_FLY_API_TOKEN",
    "organization": "lightfast",
    "region": "iad", // US East (primary region)
    "machineConfig": {
      "image": "ubuntu:22.04",
      "size": "shared-cpu-1x",
      "memory": 256
    }
  },
  "ssh": {
    "keyPath": "~/.ssh/id_rsa",
    "timeout": 30000
  }
}
```

## Development

See [CLAUDE.md](./CLAUDE.md) for development guidelines and AI assistant instructions.

## Security Considerations

- All SSH connections use key-based authentication
- API endpoints require authentication tokens
- Instance access is scoped to user permissions
- Automatic instance cleanup after inactivity

## Roadmap

- [ ] Core API implementation
- [ ] Fly.io machine provisioning
- [ ] SSH command execution
- [ ] Workflow template system
- [ ] Web UI (optional)
- [ ] Plugin architecture
- [ ] Multi-region support
- [ ] Instance snapshots
- [ ] Collaborative workflows

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT License - see LICENSE file for details