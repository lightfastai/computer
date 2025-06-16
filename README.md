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

## Example Workflows

### Built-in Workflows

1. **Git Clone and Push**
   - Creates an Ubuntu instance
   - Installs Git
   - Clones a repository
   - Waits for user changes
   - (Future: commits and pushes changes)

2. **Development Environment Setup**
   - Creates a larger instance (2 CPU, 2GB RAM)
   - Updates system packages
   - Installs development tools (git, curl, vim, tmux, etc.)
   - Installs Node.js LTS

### Example API Usage

```bash
# Execute a workflow
curl -X POST http://localhost:3000/api/workflows/{workflowId}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "repoUrl": "https://github.com/example/repo.git"
    }
  }'

# Check execution status
curl http://localhost:3000/api/workflows/executions/{executionId}
```

## How It Works

1. **Instance Creation**: When you create an instance, the system:
   - Calls Fly.io Machines API to provision an Ubuntu machine
   - Configures the machine with specified resources (CPU, memory)
   - Waits for the machine to be ready
   - Returns instance details including private IP

2. **Workflow Execution**: Workflows are multi-step automation scripts that:
   - Create instances as needed
   - Execute commands in sequence
   - Handle dependencies between steps
   - Clean up resources when complete

3. **Current Limitations**:
   - Instances only have private IPs (no public SSH access yet)
   - SSH execution is implemented but requires public IP allocation
   - In-memory storage (instances are lost on server restart)

## Architecture

The system consists of:
- **API Server**: Hono-based REST API for managing instances and executing commands
- **Fly.io Integration**: Machine creation and management via Fly.io Machines API
- **SSH Client**: Secure command execution on remote instances (SSH2 library)
- **Workflow Engine**: Orchestration of complex multi-step workflows
- **Instance Service**: Manages instance lifecycle and state

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
- **Job Queue**: Inngest for reliable workflow execution
- **Database**: SQLite/PostgreSQL for workflow state (TBD)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) (`brew install flyctl`)
- Fly.io account and API token

### Setup

```bash
# Clone the repository
git clone https://github.com/lightfastai/computer.git
cd computer

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Get your Fly.io API token
fly auth token

# Edit .env with your token:
# FLY_API_TOKEN=your_token_here
# FLY_ORG_SLUG=your_org_name

# Create Fly.io app for worker instances
fly apps create lightfast-worker-instances --org lightfast

# Run development server
bun dev

# (Optional) Run Inngest dev server for local testing
npx inngest-cli@latest dev
```

### Inngest Configuration

Inngest provides reliable background job processing with automatic retries, monitoring, and observability.

```bash
# Enable Inngest in .env
INNGEST_ENABLED=true

# For local development, run the Inngest dev server
npx inngest-cli@latest dev

# Access the Inngest dashboard at http://localhost:8288
```

### Testing the API

```bash
# Health check
curl http://localhost:3000/health

# List available workflows
curl http://localhost:3000/api/workflows

# Create an Ubuntu instance
curl -X POST http://localhost:3000/api/instances \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dev-box",
    "region": "iad",
    "size": "shared-cpu-1x",
    "memoryMb": 256
  }'

# List instances
curl http://localhost:3000/api/instances

# Execute a command (replace {instanceId})
curl -X POST http://localhost:3000/api/instances/{instanceId}/exec \
  -H "Content-Type: application/json" \
  -d '{
    "command": "uname -a",
    "timeout": 5000
  }'

# Destroy instance
curl -X DELETE http://localhost:3000/api/instances/{instanceId}
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
- `GET /instances/executions/:executionId` - Get command execution details

### Workflow Management
- `POST /workflows` - Create new workflow
- `GET /workflows` - List workflows
- `GET /workflows/:id` - Get workflow details
- `POST /workflows/:id/execute` - Execute workflow
- `GET /workflows/executions/:executionId` - Get workflow execution status
- `GET /workflows/:id/executions` - List workflow executions

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

## Current Status

### ✅ Implemented
- Core API server with Hono
- Fly.io machine provisioning
- Instance lifecycle management (create, list, destroy)
- Workflow template system with pre-built workflows
- Error handling and logging
- Development environment setup
- Inngest integration for reliable background jobs
- Retry logic and failure handling
- Workflow orchestration with step dependencies

### 🚧 In Progress
- SSH command execution on instances
- Public IP allocation for SSH access
- Interactive shell sessions

### 📋 Roadmap
- [ ] Database persistence (SQLite/PostgreSQL)
- [ ] User authentication and multi-tenancy
- [ ] Web UI dashboard
- [ ] Plugin architecture for custom workflow steps
- [ ] Instance snapshots and templates
- [ ] Cost tracking and limits
- [ ] Webhook notifications
- [ ] CLI tool for easier interaction

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT License - see LICENSE file for details