# lightfast-computer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/lightfastai/computer)](https://github.com/lightfastai/computer/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/lightfastai/computer)](https://github.com/lightfastai/computer/issues)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Bun](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=white)](https://bun.sh)

A powerful, open-source SDK for creating and managing Ubuntu instances on Fly.io with GitHub integration, command execution, and real-time streaming. Build developer tools, CI/CD systems, and sandboxed environments with ease.

🚀 **Production Ready**: Used by the Lightfast team for scalable compute infrastructure

## About

Lightfast Computer is a TypeScript SDK that transforms Fly.io into a developer-friendly compute platform. With direct Fly.io API integration and no local state management, it provides isolated Ubuntu environments, automated testing infrastructure, and dynamic compute resources on demand.

### Why Lightfast Computer?

- 📦 **Pure SDK**: Lightweight TypeScript library with zero server dependencies
- 🐧 **Ubuntu Sandboxes**: Fresh, isolated instances with GitHub integration
- 🔄 **Real-time Streaming**: Live command output with callback support
- 🔄 **Stateless Architecture**: Direct Fly.io API integration without local storage
- 🛡️ **Production Ready**: Robust error handling with Result types
- 🏗️ **Developer First**: Full TypeScript support and comprehensive documentation
- 🚀 **Fly.io Powered**: Leverage global edge compute infrastructure

## Quick Start

### Installation

```bash
npm install @lightfastai/computer
# or
bun add @lightfast/computer
```

### Basic Usage

```typescript
import createLightfastComputer from '@lightfastai/computer';

const computer = createLightfastComputer();

// Create Ubuntu instance with GitHub access
const result = await computer.instances.create({
  name: 'dev-sandbox',
  size: 'shared-cpu-2x',
  memoryMb: 1024,
  secrets: {
    githubToken: 'ghp_your_token_here'
  }
});

if (result.isOk()) {
  const instance = result.value;
  console.log(`Created instance: ${instance.id}`);
  
  // Execute commands with real-time output
  await computer.commands.execute({
    instanceId: instance.id,
    command: 'git clone https://github.com/your-repo/project.git',
    onData: (data) => console.log('OUTPUT:', data),
    onError: (error) => console.error('STDERR:', error)
  });
}
```

## Environment Setup

Create a `.env` file in your project root:

```bash
# Required
FLY_API_TOKEN=your_fly_api_token

# Optional
NODE_ENV=development
LOG_LEVEL=info
```

### 🔑 Getting API Keys

#### Fly.io API Token
```bash
# Install the Fly CLI
curl -L https://fly.io/install.sh | sh

# Authenticate
fly auth login

# Generate API token
fly auth token
```

### Core Features

#### Instance Management
- **Create**: Ubuntu instances with custom CPU/memory configurations
- **Start/Stop**: Full lifecycle control with state management
- **Destroy**: Clean resource cleanup
- **List**: View all instances with status information
- **Health Check**: Monitor instance availability

#### Command Execution
- **Real-time Output**: Stream command output as it executes
- **GitHub Integration**: Automatic token injection for repository access
- **Security**: Allowlist-based command validation
- **Timeout Control**: Configurable execution limits

#### Error Handling
- **Result Types**: neverthrow integration for safe error handling
- **Typed Errors**: Specific error types for different failure modes
- **User-friendly Messages**: Clear error descriptions for common issues

## Development

```bash
# Clone the repository
git clone https://github.com/lightfastai/computer.git
cd computer

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your Fly.io credentials

# Run tests
bun test --watch
```

## Available Scripts

```bash
# Development
bun test               # Run test suite once
bun test --watch       # Run tests in watch mode

# Production
bun run build         # Build for production

# Code Quality
bun run lint          # Check code style with Biome
bun run format        # Format code with Biome
bun run typecheck     # Verify TypeScript types
```

## Project Structure

```
src/
├── lib/            # Shared utilities and configuration
├── services/       # Business logic (instances, commands, fly)
├── schemas/        # Zod validation schemas
├── types/          # TypeScript type definitions
└── sdk.ts          # Main SDK export
tests/              # Test suites mirroring src structure
SDK_USAGE.md        # Comprehensive SDK documentation
package.json        # Dependencies and scripts
```

## Development Workflow

```bash
# Clone and setup
git clone https://github.com/lightfastai/computer.git
cd computer
bun install
cp .env.example .env
# Add your Fly.io credentials to .env

# Start development
bun test --watch        # TDD workflow
```

### Code Quality Standards

- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Testing**: Bun test with 100% coverage requirements
- **Linting**: Biome for code formatting and style enforcement
- **Architecture**: Functional programming with neverthrow Result types

## API Reference

See [SDK_USAGE.md](./SDK_USAGE.md) for comprehensive API documentation and examples.

### Core Types

```typescript
import type { 
  Instance, 
  CreateInstanceOptions, 
  ExecuteCommandOptions,
  ExecuteCommandResult 
} from '@lightfast/computer';
```

## Technology Stack

| **Component** | **Technology** | **Purpose** |
|---------------|---------------|-------------|
| **Runtime** | Bun | Fast JavaScript runtime and package manager |
| **Language** | TypeScript | Type-safe development with excellent DX |
| **Validation** | Zod | Runtime type validation and schema parsing |
| **Error Handling** | neverthrow | Functional error handling with Result types |
| **Testing** | Bun Test | Native testing framework with TypeScript support |
| **Linting** | Biome | Fast code formatting and linting |
| **Infrastructure** | Fly.io | Global edge compute platform |

## Architecture

### Key Design Principles

1. **Stateless**: No local database or state management
2. **Type Safety**: Comprehensive TypeScript coverage
3. **Error Handling**: Result types for predictable error handling
4. **Functional**: Pure functions and immutable data structures
5. **Testable**: Comprehensive test coverage with mocking

### Infrastructure Details

- **Instances**: Ubuntu 22.04 LTS on Fly.io Machines
- **Networking**: Private IPv6 with regional deployment
- **Security**: Isolated containers with resource limits
- **Regions**: Global deployment with `iad` (US East) default

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FLY_API_TOKEN` | ✅ | Fly.io API authentication token |
| `NODE_ENV` | ⚠️ | Runtime environment (defaults to development) |
| `LOG_LEVEL` | ⚠️ | Logging verbosity (defaults to info) |

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Install dependencies: `bun install`
4. Make your changes with tests
5. Run the test suite: `bun test`
6. Submit a pull request

### Code Style

- Follow existing patterns and conventions
- Add tests for new functionality
- Update documentation for API changes
- Use descriptive commit messages

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](./SDK_USAGE.md)
- 🐛 [Issue Tracker](https://github.com/lightfastai/computer/issues)
- 💬 [Discussions](https://github.com/lightfastai/computer/discussions)
- 📧 [Email Support](mailto:support@lightfast.ai)

Created by the [Lightfast](https://lightfast.ai) team.

## Roadmap

- [ ] Multi-cloud support (AWS, GCP, Azure)
- [ ] Enhanced security features
- [ ] Advanced networking and VPC support
- [ ] Kubernetes integration
- [ ] WebSocket real-time communication