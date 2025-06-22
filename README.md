# lightfast-computer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/lightfastai/computer)](https://github.com/lightfastai/computer/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/lightfastai/computer)](https://github.com/lightfastai/computer/issues)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Bun](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=white)](https://bun.sh)

A powerful, open-source SDK for creating and managing Ubuntu instances on Fly.io with GitHub integration, command execution, and real-time streaming. Build developer tools, CI/CD systems, and sandboxed environments with ease.

🚀 **Production Ready**: Used by the Lightfast team for scalable compute infrastructure

## About

Lightfast Computer is a stateless SDK and HTTP API that transforms Fly.io into a developer-friendly compute platform. With direct Fly.io API integration and no local state management, it provides isolated Ubuntu environments, automated testing infrastructure, and dynamic compute resources on demand.

### Why Lightfast Computer?

- ⚡ **Dual Interface**: Use as SDK library or standalone HTTP service
- 🐧 **Ubuntu Sandboxes**: Fresh, isolated instances with GitHub integration
- 🔄 **Real-time Streaming**: Live command output via Server-Sent Events
- 🔄 **Stateless Architecture**: Direct Fly.io API integration without local storage
- 🛡️ **Production Ready**: Robust error handling with Result types
- 🏗️ **Developer First**: Full TypeScript support and comprehensive documentation
- 🚀 **Fly.io Powered**: Leverage global edge compute infrastructure

## Quick Start

### As SDK Library

```typescript
import createLightfastComputer from 'lightfast-computer';

const computer = createLightfastComputer({
  storage: 'file',
  dataDir: './data'
});

// Create Ubuntu instance with GitHub access
const result = await computer.instances.create({
  name: 'dev-sandbox',
  region: 'iad',
  size: 'shared-cpu-2x',
  memoryMb: 1024,
  secrets: {
    githubToken: process.env.GITHUB_TOKEN,
    githubUsername: 'your-username'
  },
  repoUrl: 'https://github.com/your-org/repo.git'
});

if (result.isOk()) {
  // Execute commands with real-time streaming
  const cmdResult = await computer.commands.execute({
    instanceId: result.value.id,
    command: 'ls',
    args: ['-la', '/workspace'],
    onData: (data) => console.log('STDOUT:', data),
    onError: (error) => console.error('STDERR:', error)
  });
}
```

### As HTTP Service

```bash
# Start the server
bun dev

# Create instance via API
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
    "repoUrl": "https://github.com/your-org/repo.git"
  }'
```

## Environment Variables

This project uses `@t3-oss/env-core` for type-safe environment variable validation. The environment configuration is defined in `src/lib/env.ts`.

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Fly.io Configuration (Required)
FLY_API_TOKEN=your_fly_api_token_here        # Get from: fly auth token

# Application Configuration (Optional)
PORT=3000                                    # Server port (default: 3000)
NODE_ENV=development                         # Environment: development/production (default: development)
LOG_LEVEL=info                              # Logging level: debug/info/warn/error (default: info)
```

### Environment Variable Categories

#### **🔒 Required Variables**
- `FLY_API_TOKEN` - Fly.io API authentication token (get with `fly auth token`)

#### **⚙️ Optional Variables**
- `PORT` - HTTP server port (default: 3000)
- `NODE_ENV` - Runtime environment (default: development)
- `LOG_LEVEL` - Logging verbosity level (default: info)

### 🔑 Getting API Keys

- **Fly.io API Token**: Run `fly auth token` after installing [Fly CLI](https://fly.io/docs/flyctl/install/)

## Installation & Setup

### Option 1: Use as SDK

```bash
# Install in your project
npm install lightfast-computer
# or
bun add lightfast-computer
```

```typescript
import createLightfastComputer from 'lightfast-computer';

const computer = createLightfastComputer();
// Start building with instances and commands
```

### Option 2: Run as Service

```bash
# Clone the repository
git clone https://github.com/lightfastai/computer.git
cd computer

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your Fly.io credentials

# Start development server
bun dev

# Or build for production
bun run build
bun start
```

## ✨ Features

### 🖥️ Instance Management
- **Ubuntu Sandboxes**: Fresh Ubuntu 22.04 instances on-demand
- **GitHub Integration**: Automatic repository cloning with secure token injection
- **Lifecycle Control**: Create, start, stop, restart, and destroy operations
- **Health Monitoring**: Real-time instance health checking and statistics
- **Auto-cleanup**: Automatic removal of old destroyed instances

### 🚀 Command Execution
- **Real-time Streaming**: Live command output via Server-Sent Events (SSE)
- **Security Whitelist**: Restricted command set for safe execution
- **Command History**: Persistent history tracking for debugging
- **Timeout Handling**: Configurable timeouts with graceful termination
- **Error Isolation**: Separate stdout/stderr streaming channels

### 🗄️ Storage Flexibility
- **In-Memory Storage**: Fast, ephemeral storage for development
- **File-Based Storage**: Persistent storage across restarts
- **Custom Backends**: Implement your own storage interface
- **Automatic Persistence**: Seamless data persistence and restoration

### 🛡️ Enterprise Ready
- **Type Safety**: Full TypeScript with strict validation
- **Error Handling**: Robust Result types with neverthrow
- **Input Validation**: Comprehensive request validation with Zod
- **Security First**: Command restrictions and token management
- **Production Logging**: Structured logging with Pino

## 🏗️ Architecture

### SDK Interface
- **Clean API**: Intuitive methods for instance and command management
- **Result Types**: Functional error handling with neverthrow
- **Storage Abstraction**: Pluggable backends for different use cases
- **TypeScript First**: Full type safety and intellisense support

### HTTP Service
- **Hono Framework**: Lightweight, fast web framework
- **RESTful Design**: Clean, predictable API endpoints
- **Real-time Streaming**: Server-Sent Events for live updates
- **Comprehensive Validation**: Request/response validation with Zod

### Infrastructure
- **Fly.io Machines**: Ubuntu instances on global edge infrastructure
- **Regional Deployment**: Choose optimal regions for your workloads
- **Auto-scaling**: Instances start and stop based on demand
- **Network Isolation**: Private networking with IPv6 support

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|------------|----------|
| **Runtime** | Bun | Fast JavaScript runtime with built-in testing |
| **Framework** | Hono | Lightweight web framework for APIs |
| **Language** | TypeScript | Type safety and developer experience |
| **Validation** | Zod | Runtime schema validation |
| **Error Handling** | neverthrow | Functional Result types |
| **Infrastructure** | Fly.io | Global edge compute platform |
| **Logging** | Pino | High-performance structured logging |
| **Testing** | Bun Test | Built-in testing framework |

## API Reference

### Instance Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instances` | POST | Create new Ubuntu instance |
| `/api/instances` | GET | List all instances |
| `/api/instances/:id` | GET | Get instance details |
| `/api/instances/:id/start` | POST | Start stopped instance |
| `/api/instances/:id/stop` | POST | Stop running instance |
| `/api/instances/:id/restart` | POST | Restart instance |
| `/api/instances/:id` | DELETE | Destroy instance permanently |
| `/api/instances/:id/health` | GET | Check instance health |
| `/api/instances/stats/summary` | GET | Get instance statistics |

### Command Execution

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/commands/:id/exec` | POST | Execute command with streaming |
| `/api/commands/:id/history` | GET | Get command execution history |

### Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | API health check |
| `/api/monitoring/health` | GET | Detailed health status |

## Available Scripts

```bash
# Development
bun dev                 # Start development server with hot reload
bun test               # Run test suite once
bun test --watch       # Run tests in watch mode

# Production
bun run build         # Build for production
bun start             # Start production server

# Code Quality
bun run lint          # Check code style with Biome
bun run format        # Format code with Biome
bun run typecheck     # Verify TypeScript types

# Environment
bun run with-env      # Run commands with .env loaded
```

## Project Structure

```
├── src/
│   ├── api/            # HTTP API routes and handlers
│   ├── lib/            # Shared utilities and configuration
│   ├── services/       # Business logic (instances, commands, fly)
│   ├── schemas/        # Zod validation schemas
│   ├── types/          # TypeScript type definitions
│   ├── sdk.ts          # Main SDK export
│   └── index.ts        # HTTP server entry point
├── tests/              # Test suites mirroring src structure
├── SDK_USAGE.md        # Comprehensive SDK documentation
└── package.json        # Dependencies and scripts
```

## Development Workflow

### Setting Up Development Environment

```bash
# Clone and setup
git clone https://github.com/lightfastai/computer.git
cd computer
bun install

# Configure environment
cp .env.example .env
# Add your Fly.io credentials to .env

# Start development
bun test --watch        # In one terminal (TDD workflow)
bun dev                 # In another terminal
```

### Code Quality Standards

- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Functional Programming**: No classes, pure functions with Result types
- **Test-Driven Development**: Write tests first, then implementation
- **Error Handling**: All operations return Result<T, E> types
- **Documentation**: Comprehensive inline docs and usage examples

### Testing Strategy

```bash
# Unit tests for individual services
bun test tests/services/

# Integration tests for SDK interface
bun test tests/sdk.test.ts

# Storage abstraction tests
bun test tests/lib/storage.test.ts

# Run specific test patterns
bun test --grep "instance creation"
```

## 🚀 Deployment

### Option 1: Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly deploy

# Monitor deployment
fly status
fly logs
```

### Option 2: Docker Deployment

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build application
COPY . .
RUN bun run build

# Production image
FROM oven/bun:1-slim
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

EXPOSE 3000
CMD ["bun", "start"]
```

### Environment Variables for Production

| Variable | Required | Description |
|----------|----------|-------------|
| `FLY_API_TOKEN` | ✅ | Fly.io API authentication token |
| `FLY_ORG_SLUG` | ✅ | Fly.io organization identifier |
| `PORT` | ⚠️ | Server port (defaults to 3000) |
| `NODE_ENV` | ⚠️ | Set to `production` for optimizations |
| `LOG_LEVEL` | ⚠️ | Logging verbosity (info/warn/error) |

## 📚 Documentation

- [**SDK Usage Guide**](./SDK_USAGE.md) - Comprehensive SDK documentation with examples
- [**API Reference**](./docs/api-reference.md) - Complete HTTP API documentation
- [**Storage Backends**](./docs/storage.md) - Guide to storage configuration
- [**Deployment Guide**](./docs/deployment.md) - Production deployment instructions
- [**Examples**](./examples/) - Real-world usage examples and patterns

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b jeevanpillay/amazing-feature`
3. Make your changes following our code standards
4. Add comprehensive tests for new functionality
5. Submit a pull request with detailed description

### Code Standards
- **TypeScript**: Strict mode with comprehensive type checking
- **Functional Programming**: Pure functions, no classes allowed
- **Testing**: Minimum 80% test coverage for new features
- **Documentation**: Update relevant docs for API changes
- **Commit Messages**: Follow conventional commit format

## Security Considerations

### Command Execution Security
- **Allowlist**: Only approved commands can be executed
- **Sandboxing**: All commands run in isolated Ubuntu containers
- **Timeout Protection**: Automatic termination of long-running commands
- **Resource Limits**: CPU and memory restrictions per instance

### Token Management
- **Secure Storage**: GitHub tokens stored as Fly.io secrets
- **No Logging**: Sensitive data never appears in logs
- **Environment Isolation**: Tokens scoped to individual instances
- **Automatic Cleanup**: Tokens removed when instances are destroyed

## Performance & Scaling

### Instance Performance
- **Fast Provisioning**: New instances ready in ~10-15 seconds
- **Auto-sleep**: Instances automatically sleep when idle
- **Regional Distribution**: Deploy close to your users
- **Resource Optimization**: Right-sized instances for your workloads

### API Performance
- **Connection Pooling**: Efficient Fly.io API connections
- **Request Batching**: Optimized batch operations for multiple instances
- **Caching**: Intelligent caching of instance metadata
- **Streaming**: Real-time command output without buffering

## 📄 License

This project is licensed under the [MIT License](LICENSE).

**TL;DR**: You can use this software for any purpose, including commercial applications. See LICENSE file for full terms.

## 🌟 Community

- **Website**: [lightfast.ai](https://lightfast.ai)
- **GitHub**: [github.com/lightfastai/computer](https://github.com/lightfastai/computer)
- **Discord**: [Join our community](https://discord.gg/YqPDfcar2C)
- **Twitter**: [@lightfastai](https://x.com/lightfastai)

## 💖 Support

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs and requesting features
- 💡 Contributing code or documentation
- 📢 Sharing with your developer community
- 💬 Joining our Discord for discussions

## Roadmap

### 🔄 Current Focus
- [ ] Enhanced error handling and validation
- [ ] Connection pooling for performance
- [ ] Authentication and rate limiting
- [ ] Monitoring and observability features

### 🚀 Future Plans
- [ ] Multi-cloud support (AWS, GCP, Azure)
- [ ] Container orchestration integration
- [ ] Advanced networking and VPC support
- [ ] Managed database instances
- [ ] Auto-scaling policies

---

**Built with ❤️ by the Lightfast team • Powering the next generation of developer tools**