# Vercel Sandbox with Lightfast Computer SDK

This guide covers how to use Vercel Sandbox as a compute provider with the Lightfast Computer SDK. Vercel Sandbox provides ephemeral compute environments perfect for AI agents, code generation, and developer experimentation.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Core Concepts](#core-concepts)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Limitations and Considerations](#limitations-and-considerations)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Migration from Fly.io](#migration-from-flyio)

## Overview

### What is Vercel Sandbox?

Vercel Sandbox is an ephemeral compute primitive designed to safely run untrusted or user-generated code. It provides isolated Linux VMs (Firecracker MicroVMs) that are perfect for:

- **AI Agent Operations**: Execute AI-generated code safely
- **Code Generation**: Run and test generated code in isolation
- **Developer Experimentation**: Try out code without affecting production systems
- **CI/CD Pipelines**: Run tests and builds in clean environments

### Key Features

- **Ephemeral**: Sandboxes are temporary with a maximum runtime of 45 minutes
- **Isolated**: Each sandbox runs in its own Firecracker MicroVM
- **Git Integration**: Automatic repository cloning during creation
- **Multiple Runtimes**: Support for Node.js 22 and Python 3.13
- **Network Access**: Full internet connectivity for package installation
- **File System**: Complete Linux environment with file system access

## Getting Started

### Prerequisites

1. **Vercel Account**: You need a Vercel account with sandbox access
2. **Vercel Token**: Generate a token from [Vercel Dashboard](https://vercel.com/account/tokens)
3. **Project Setup**: Optionally create a Vercel project for sandbox management

### Installation

Install the Lightfast Computer SDK with Vercel Sandbox support:

```bash
npm install @lightfastai/computer
# or
bun add @lightfastai/computer
```

### Quick Start

```typescript
import { createLightfastComputer } from '@lightfastai/computer';

const computer = createLightfastComputer({
  provider: 'vercel',
  vercelToken: process.env.VERCEL_TOKEN!,
  projectId: process.env.VERCEL_PROJECT_ID, // optional
  teamId: process.env.VERCEL_TEAM_ID,       // optional
});

// Create a sandbox with automatic git clone
const result = await computer.instances.create({
  name: 'my-sandbox',
  region: 'iad1', // Only region currently supported
  repoUrl: 'https://github.com/vercel/next.js.git',
});

if (result.isOk()) {
  const sandbox = result.value;
  console.log(`Sandbox created: ${sandbox.id}`);
  
  // Execute commands
  const cmdResult = await computer.commands.execute(sandbox.id, {
    command: 'ls -la /workspace',
  });
  
  if (cmdResult.isOk()) {
    console.log(cmdResult.value.stdout);
  }
}
```

## Configuration

### Basic Configuration

```typescript
interface VercelProviderConfig {
  provider: 'vercel';
  vercelToken: string;    // Required: Vercel API token
  projectId?: string;     // Optional: Vercel project ID
  teamId?: string;        // Optional: Vercel team ID
  logger?: Logger;        // Optional: Custom logger
}
```

### Environment Variables

Set up your environment variables:

```bash
# Required
export VERCEL_TOKEN="your_vercel_token_here"

# Optional but recommended
export VERCEL_PROJECT_ID="your_project_id"
export VERCEL_TEAM_ID="your_team_id"
```

### Authentication

#### Option 1: Environment Variables (Recommended)

```typescript
const computer = createLightfastComputer({
  provider: 'vercel',
  vercelToken: process.env.VERCEL_TOKEN!,
  projectId: process.env.VERCEL_PROJECT_ID,
  teamId: process.env.VERCEL_TEAM_ID,
});
```

#### Option 2: Direct Configuration

```typescript
const computer = createLightfastComputer({
  provider: 'vercel',
  vercelToken: 'your_actual_token',
  projectId: 'prj_abc123',
  teamId: 'team_xyz789',
});
```

## Core Concepts

### Sandbox Lifecycle

1. **Creation**: Sandbox is created with optional git repository
2. **Initialization**: Runtime environment is set up (Node.js/Python)
3. **Ready**: Sandbox is ready to execute commands
4. **Execution**: Commands can be run in the sandbox
5. **Timeout/Destroy**: Sandbox automatically stops after timeout or manual destruction

### Runtime Environments

#### Node.js 22 (Default)
- Full Node.js 22 runtime
- npm package manager
- Git for repository operations
- Common development tools

#### Python 3.13
```typescript
const result = await computer.instances.create({
  name: 'python-sandbox',
  region: 'iad1',
  // Python runtime will be supported in future versions
});
```

### Resource Allocation

Sandboxes can be configured with different resource levels:

```typescript
const sizes = {
  'small': '1 vCPU',   // 1 vCPU, 2 GB RAM
  'medium': '2 vCPUs', // 2 vCPUs, 4 GB RAM (default)
  'large': '4 vCPUs',  // 4 vCPUs, 8 GB RAM
  'xlarge': '8 vCPUs', // 8 vCPUs, 16 GB RAM (maximum)
};

const result = await computer.instances.create({
  name: 'high-performance-sandbox',
  region: 'iad1',
  size: 'large', // 4 vCPUs
});
```

## Usage Examples

### Example 1: Git Repository Analysis

```typescript
async function analyzeRepository(repoUrl: string) {
  const computer = createLightfastComputer({
    provider: 'vercel',
    vercelToken: process.env.VERCEL_TOKEN!,
  });

  const createResult = await computer.instances.create({
    name: 'repo-analyzer',
    region: 'iad1',
    repoUrl,
  });

  if (createResult.isErr()) {
    throw new Error(`Failed to create sandbox: ${createResult.error.message}`);
  }

  const sandbox = createResult.value;

  try {
    // Analyze package.json
    const packageResult = await computer.commands.execute(sandbox.id, {
      command: 'cat /workspace/package.json',
    });

    // Count lines of code
    const locResult = await computer.commands.execute(sandbox.id, {
      command: 'find /workspace -name "*.js" -o -name "*.ts" | xargs wc -l',
    });

    // Get git information
    const gitResult = await computer.commands.execute(sandbox.id, {
      command: 'cd /workspace && git log --oneline -10',
    });

    return {
      packageInfo: packageResult.isOk() ? packageResult.value.stdout : null,
      linesOfCode: locResult.isOk() ? locResult.value.stdout : null,
      recentCommits: gitResult.isOk() ? gitResult.value.stdout : null,
    };
  } finally {
    // Clean up
    await computer.instances.destroy(sandbox.id);
  }
}
```

### Example 2: Code Testing and Validation

```typescript
async function testCode(code: string, tests: string) {
  const computer = createLightfastComputer({
    provider: 'vercel',
    vercelToken: process.env.VERCEL_TOKEN!,
  });

  const createResult = await computer.instances.create({
    name: 'code-tester',
    region: 'iad1',
    size: 'medium',
  });

  if (createResult.isErr()) {
    throw new Error(`Failed to create sandbox: ${createResult.error.message}`);
  }

  const sandbox = createResult.value;

  try {
    // Create test files
    await computer.commands.execute(sandbox.id, {
      command: `echo '${code}' > /workspace/code.js`,
    });

    await computer.commands.execute(sandbox.id, {
      command: `echo '${tests}' > /workspace/test.js`,
    });

    // Install test dependencies
    await computer.commands.execute(sandbox.id, {
      command: 'cd /workspace && npm init -y && npm install jest',
      timeout: 60000,
    });

    // Run tests
    const testResult = await computer.commands.execute(sandbox.id, {
      command: 'cd /workspace && npx jest test.js',
      timeout: 30000,
    });

    return {
      success: testResult.isOk() && testResult.value.exitCode === 0,
      output: testResult.isOk() ? testResult.value.stdout : testResult.error.message,
      stderr: testResult.isOk() ? testResult.value.stderr : '',
    };
  } finally {
    await computer.instances.destroy(sandbox.id);
  }
}
```

### Example 3: Package Installation and Execution

```typescript
async function runWithDependencies(packageName: string, code: string) {
  const computer = createLightfastComputer({
    provider: 'vercel',
    vercelToken: process.env.VERCEL_TOKEN!,
  });

  const createResult = await computer.instances.create({
    name: 'package-runner',
    region: 'iad1',
  });

  if (createResult.isErr()) {
    throw new Error(`Failed to create sandbox: ${createResult.error.message}`);
  }

  const sandbox = createResult.value;

  try {
    // Initialize npm project
    await computer.commands.execute(sandbox.id, {
      command: 'cd /workspace && npm init -y',
    });

    // Install package
    const installResult = await computer.commands.execute(sandbox.id, {
      command: `cd /workspace && npm install ${packageName}`,
      timeout: 120000, // 2 minutes for package installation
    });

    if (installResult.isErr()) {
      throw new Error(`Package installation failed: ${installResult.error.message}`);
    }

    // Create and run code
    await computer.commands.execute(sandbox.id, {
      command: `echo '${code}' > /workspace/script.js`,
    });

    const runResult = await computer.commands.execute(sandbox.id, {
      command: 'cd /workspace && node script.js',
    });

    return {
      installOutput: installResult.value.stdout,
      executionResult: runResult.isOk() ? runResult.value : runResult.error,
    };
  } finally {
    await computer.instances.destroy(sandbox.id);
  }
}
```

## API Reference

### Creating Sandboxes

```typescript
interface CreateMachineOptions {
  name: string;           // Sandbox name
  region: 'iad1';        // Only iad1 supported currently
  size?: string;         // 'small' | 'medium' | 'large' | 'xlarge'
  repoUrl?: string;      // Optional git repository to clone
  githubToken?: string;  // For private repositories
  githubUsername?: string; // GitHub username for authentication
  metadata?: Record<string, string>; // Additional environment variables
}

const result = await computer.instances.create(options);
```

### Executing Commands

```typescript
interface CommandOptions {
  command: string;      // Command to execute
  timeout?: number;     // Timeout in milliseconds (default: 30000)
}

const result = await computer.commands.execute(sandboxId, options);
```

### Managing Sandboxes

```typescript
// List all sandboxes
const listResult = await computer.instances.list();

// Get sandbox details
const getResult = await computer.instances.get(sandboxId);

// Start a stopped sandbox
const startResult = await computer.instances.start(sandboxId);

// Stop a running sandbox
const stopResult = await computer.instances.stop(sandboxId);

// Destroy a sandbox
const destroyResult = await computer.instances.destroy(sandboxId);
```

## Limitations and Considerations

### Technical Limitations

- **Maximum Runtime**: 45 minutes per sandbox
- **Maximum Resources**: 8 vCPUs, 16 GB RAM
- **Region**: Only `iad1` (US East) currently supported
- **No Sudo**: Root access is not available
- **User Context**: Runs as `vercel-sandbox` user

### Pricing Considerations

- **Fluid Compute Model**: Pay only for active CPU time
- **Active CPU Charges**: When CPU is actively executing
- **Provisioned Memory**: Charged at 1/11th rate when waiting
- **Invocation Costs**: Per sandbox creation

### Security Limitations

- **No Persistent Storage**: All data is lost when sandbox is destroyed
- **Network Isolation**: Sandboxes cannot communicate with each other
- **No External Volume Mounts**: Cannot mount external file systems

## Best Practices

### Resource Management

1. **Choose Appropriate Size**: Start with 'medium' (2 vCPUs) for most use cases
2. **Set Reasonable Timeouts**: Commands should complete within expected time
3. **Clean Up**: Always destroy sandboxes when finished

```typescript
try {
  const sandbox = await createSandbox();
  await doWork(sandbox);
} finally {
  await computer.instances.destroy(sandbox.id);
}
```

### Error Handling

1. **Check Results**: Always check if Result is Ok or Err
2. **Handle Timeouts**: Set appropriate timeouts for long operations
3. **Retry Logic**: Implement retry for transient failures

```typescript
const result = await computer.commands.execute(sandboxId, {
  command: 'npm install',
  timeout: 120000,
});

if (result.isErr()) {
  console.error('Command failed:', result.error.message);
  // Handle error appropriately
  return;
}

const { stdout, stderr, exitCode } = result.value;
if (exitCode !== 0) {
  console.error('Command exited with error:', stderr);
}
```

### Performance Optimization

1. **Batch Operations**: Combine multiple commands when possible
2. **Use Appropriate Timeouts**: Avoid unnecessarily long timeouts
3. **Parallel Execution**: Create multiple sandboxes for independent tasks

```typescript
// Instead of sequential execution
const sandbox1 = await createSandbox();
await processRepo1(sandbox1);
await computer.instances.destroy(sandbox1.id);

const sandbox2 = await createSandbox();
await processRepo2(sandbox2);
await computer.instances.destroy(sandbox2.id);

// Use parallel execution
const [result1, result2] = await Promise.all([
  processRepoInSandbox(repo1Url),
  processRepoInSandbox(repo2Url),
]);
```

### Git Repository Handling

1. **Use Shallow Clones**: For large repositories, consider shallow clones
2. **Handle Authentication**: Use GitHub tokens for private repositories
3. **Check Repository Size**: Large repositories may timeout during clone

```typescript
// For large repositories, clone manually with depth limit
await computer.commands.execute(sandboxId, {
  command: `git clone --depth 1 ${repoUrl} /workspace/repo`,
  timeout: 60000,
});
```

## Troubleshooting

### Common Issues

#### Sandbox Creation Fails

**Problem**: Sandbox creation returns an error

**Solutions**:
1. Check Vercel token validity
2. Verify project and team IDs
3. Ensure account has sandbox access
4. Check for rate limiting

```typescript
const createResult = await computer.instances.create(options);

if (createResult.isErr()) {
  const error = createResult.error;
  
  if (error.message.includes('authentication')) {
    console.error('Invalid Vercel token or insufficient permissions');
  } else if (error.message.includes('rate limit')) {
    console.error('Rate limit exceeded, try again later');
  } else {
    console.error('Sandbox creation failed:', error.message);
  }
}
```

#### Command Execution Timeouts

**Problem**: Commands time out before completion

**Solutions**:
1. Increase timeout for long-running operations
2. Break down complex operations into smaller steps
3. Check for infinite loops or hanging processes

```typescript
// For package installation
const result = await computer.commands.execute(sandboxId, {
  command: 'npm install',
  timeout: 180000, // 3 minutes
});
```

#### Git Clone Failures

**Problem**: Repository cloning fails

**Solutions**:
1. Check repository URL validity
2. Use authentication for private repositories
3. Consider repository size and clone timeout

```typescript
// For private repositories
const result = await computer.instances.create({
  name: 'private-repo-sandbox',
  region: 'iad1',
  repoUrl: 'https://github.com/private/repo.git',
  githubToken: process.env.GITHUB_TOKEN,
  githubUsername: 'your-username',
});
```

#### Memory or CPU Issues

**Problem**: Sandbox runs out of resources

**Solutions**:
1. Increase sandbox size
2. Optimize memory usage in your code
3. Break down CPU-intensive tasks

```typescript
const result = await computer.instances.create({
  name: 'resource-intensive-task',
  region: 'iad1',
  size: 'xlarge', // Maximum resources
});
```

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
const computer = createLightfastComputer({
  provider: 'vercel',
  vercelToken: process.env.VERCEL_TOKEN!,
  logger: {
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    debug: (...args) => console.debug('[DEBUG]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
  },
});
```

### Getting Help

1. **Check Vercel Status**: Visit [Vercel Status Page](https://vercel.com/status)
2. **Review Logs**: Check sandbox execution logs for specific errors
3. **Contact Support**: For persistent issues, contact Vercel support
4. **Community**: Join the Vercel community for help and discussions

## Migration from Fly.io

If you're migrating from the Fly.io provider to Vercel Sandbox, here are the key differences:

### Configuration Changes

```typescript
// Before (Fly.io)
const computer = createLightfastComputer({
  provider: 'fly',
  flyApiToken: process.env.FLY_API_TOKEN!,
  appName: 'my-fly-app',
});

// After (Vercel Sandbox)
const computer = createLightfastComputer({
  provider: 'vercel',
  vercelToken: process.env.VERCEL_TOKEN!,
  projectId: process.env.VERCEL_PROJECT_ID,
});
```

### Feature Differences

| Feature | Fly.io | Vercel Sandbox |
|---------|--------|----------------|
| **Maximum Runtime** | Unlimited (until stopped) | 45 minutes |
| **Persistent Storage** | Yes | No |
| **Regions** | Multiple | iad1 only |
| **Custom Images** | Yes | No (preset environments) |
| **SSH Access** | No | No |
| **Root Access** | Limited | No |
| **Runtimes** | Ubuntu-based | Node.js/Python preset |

### Migration Strategy

1. **Identify Long-Running Tasks**: Tasks over 45 minutes need restructuring
2. **Update Configuration**: Change provider configuration
3. **Test Thoroughly**: Verify all functionality works with new provider
4. **Update Documentation**: Update any provider-specific documentation

### Code Changes Required

Minimal code changes are required as the SDK provides a consistent interface:

```typescript
// This code works with both providers
const result = await computer.instances.create({
  name: 'my-instance',
  region: 'iad1', // Make sure to use supported region
  repoUrl: 'https://github.com/my/repo.git',
});

const cmdResult = await computer.commands.execute(result.value.id, {
  command: 'ls -la',
});
```

---

## Conclusion

Vercel Sandbox provides a powerful, secure environment for running ephemeral compute tasks. While it has some limitations compared to traditional VPS solutions, its isolation, ease of use, and integration with the Vercel ecosystem make it ideal for AI agents, code generation, and development experimentation.

For more examples and advanced usage patterns, check out the [examples directory](./examples/) in the SDK repository.