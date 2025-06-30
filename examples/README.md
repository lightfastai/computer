# Lightfast Computer SDK Examples

This directory contains examples demonstrating how to use the Lightfast Computer SDK with the new provider abstraction pattern.

## Provider Configuration

The SDK now uses a provider abstraction pattern. Here's how to configure it:

### Fly.io Provider

```typescript
import createLightfastComputer from '@lightfastai/computer';

const computer = createLightfastComputer({
  provider: 'fly',
  flyApiToken: process.env.FLY_API_TOKEN || 'your_fly_api_token_here',
  appName: process.env.FLY_APP_NAME || 'lightfast-worker-instances'
});
```

### Vercel Provider

```typescript
const computer = createLightfastComputer({
  provider: 'vercel',
  vercelToken: process.env.VERCEL_TOKEN || 'your_vercel_token_here',
  projectId: 'your-project-id', // optional
  teamId: 'your-team-id' // optional
});
```

## Examples

### 1. Basic Usage (`basic-usage.ts`)

Demonstrates the fundamental operations:
- Creating an instance
- Executing commands
- Getting instance statistics
- Destroying instances

```bash
bun run examples/basic-usage.ts
```

### 2. Command Streaming (`command-streaming-sdk.ts`)

Shows how to execute commands with real-time output streaming:
- Starting instances
- Executing multiple commands
- Handling stdout/stderr streams
- Command output callbacks

```bash
# With existing instance
bun run examples/command-streaming-sdk.ts <instance-id>

# Creates new instance
bun run examples/command-streaming-sdk.ts
```

### 3. Git Operations (`fly-provider-with-git.ts`)

Comprehensive example demonstrating:
- Provider configuration
- Instance lifecycle management
- Git repository cloning
- File system operations
- System information gathering
- Cleanup strategies

```bash
# Set optional environment variables
export DEMO_REPO_URL="https://github.com/your-org/your-repo.git"
export FLY_API_TOKEN="your_token_here"

bun run examples/fly-provider-with-git.ts
```

### 4. GitHub Integration (`create-instance-with-github.ts`)

Focused example for GitHub workflows:
- Cloning GitHub repositories
- Exploring repository contents
- Reading documentation files
- Git operations (status, log, etc.)

```bash
# Set repository URL
export GITHUB_REPO_URL="https://github.com/your-org/your-repo.git"

bun run examples/create-instance-with-github.ts
```

### 5. Vercel Sandbox Example (`vercel-provider-example.ts`)

Comprehensive Vercel Sandbox demonstration:
- Creating ephemeral compute instances with Vercel Sandbox
- Automatic git repository cloning
- File system operations and exploration
- Development environment setup (Node.js, npm, git)
- Dependency installation and package management
- File creation and manipulation

```bash
# Set required environment variables
export VERCEL_TOKEN="your_vercel_token_here"
export VERCEL_PROJECT_ID="your_project_id"  # optional
export VERCEL_TEAM_ID="your_team_id"        # optional

bun run examples/vercel-provider-example.ts
```

### 6. Vercel Git Clone Demo (`vercel-git-clone-demo.ts`)

Focused demonstration of git operations with Vercel Sandbox:
- Automatic git clone during sandbox creation
- Manual git clone operations
- Multiple repository management
- Repository exploration and analysis
- File discovery and structure analysis

```bash
# Set required environment variable
export VERCEL_TOKEN="your_vercel_token_here"

bun run examples/vercel-git-clone-demo.ts
```

### 7. Next.js Application (`nextjs-app/`)

A complete Next.js application demonstrating:
- Web interface for instance management
- API routes using the SDK
- Real-time command execution
- Instance monitoring

```bash
cd examples/nextjs-app
npm install
npm run dev
```

## Environment Variables

Create a `.env` file in the examples directory or set these environment variables:

```bash
# Required for Fly.io provider
FLY_API_TOKEN=your_fly_api_token_here
FLY_APP_NAME=lightfast-worker-instances

# Required for Vercel provider
VERCEL_TOKEN=your_vercel_token_here
VERCEL_PROJECT_ID=your_project_id  # optional
VERCEL_TEAM_ID=your_team_id        # optional

# Optional for git examples
DEMO_REPO_URL=https://github.com/octocat/Hello-World.git
GITHUB_REPO_URL=https://github.com/your-org/your-repo.git
```

## Key Features Demonstrated

### Provider Abstraction
- Clean separation between providers
- Consistent interface across different compute platforms
- Easy switching between Fly.io and future providers

### Git Integration
- Repository cloning with proper error handling
- File system exploration
- Git operations (log, status, branch info)
- README file detection and reading

### File Operations
- Directory listing (`ls`)
- File content reading (`cat`)
- File creation and editing
- Directory traversal and search

### System Information
- OS details and version information
- Memory and disk usage monitoring
- Process management
- Network information

### Error Handling
- Result pattern with neverthrow
- Proper error propagation
- Technical details for debugging
- User-friendly error messages

### Real-time Output
- Streaming command output
- Separate stdout/stderr handling
- Progress monitoring
- Interactive feedback

## Common Patterns

### Instance Lifecycle
```typescript
// Create
const createResult = await computer.instances.create(options);
if (createResult.isErr()) {
  // Handle error
  return;
}
const instance = createResult.value;

// Wait for ready state
while (status !== 'running') {
  await new Promise(resolve => setTimeout(resolve, 2000));
  const statusResult = await computer.instances.get(instance.id);
  // Check status...
}

// Use instance
await computer.commands.execute({
  instanceId: instance.id,
  command: 'ls',
  args: ['-la']
});

// Cleanup
await computer.instances.destroy(instance.id);
```

### Command Execution with Streaming
```typescript
const result = await computer.commands.execute({
  instanceId: instance.id,
  command: 'git',
  args: ['clone', repoUrl, '/workspace'],
  timeout: 60000,
  onData: (data) => process.stdout.write(data),
  onError: (error) => process.stderr.write(error)
});

if (result.isErr()) {
  console.error('Command failed:', result.error.message);
  return;
}

console.log('Exit code:', result.value.exitCode);
```

## Troubleshooting

### Common Issues

1. **Instance not ready**: Wait for status === 'running' before executing commands
2. **Command timeouts**: Increase timeout for long-running operations like git clone
3. **Permission errors**: Some commands may require different user permissions
4. **Network issues**: Ensure your Fly.io token has the correct permissions

### Debug Mode

Enable debug logging by providing a logger:

```typescript
const computer = createLightfastComputer({
  provider: 'fly',
  flyApiToken: process.env.FLY_API_TOKEN,
  appName: process.env.FLY_APP_NAME,
  logger: {
    info: console.log,
    error: console.error,
    debug: console.debug,
    warn: console.warn
  }
});
```

## Migration from Legacy Configuration

### Before (Legacy)
```typescript
const computer = createLightfastComputer({
  flyApiToken: 'your_token',
  appName: 'your_app'
});
```

### After (Provider Pattern)
```typescript
const computer = createLightfastComputer({
  provider: 'fly',
  flyApiToken: 'your_token',
  appName: 'your_app'
});
```

The provider field is now required and enables future support for multiple compute providers.