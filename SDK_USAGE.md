# Lightfast Computer SDK Usage

This document shows how to use the Lightfast Computer SDK for programmatic instance management.

## Installation

```bash
npm install @lightfastai/computer
# or
bun add lightfast-computer
```

## Basic Usage

```typescript
import createLightfastComputer from '@lightfastai/computer';
// or
import { createLightfastComputer } from '@lightfastai/computer';

// Basic usage
const computer = createLightfastComputer({
  flyApiToken: 'your_fly_api_token'
});

// With custom app name and logger
import pino from 'pino';

const customLogger = pino({ level: 'debug' });

const computer = createLightfastComputer({
  flyApiToken: 'your_fly_api_token',
  appName: 'my-custom-app', // defaults to 'lightfast-worker-instances'
  logger: customLogger // defaults to built-in logger
});
```

## Configuration

The SDK requires a Fly.io API token passed directly to the constructor:

```typescript
const computer = createLightfastComputer({
  flyApiToken: 'your_fly_api_token' // Required
});
```

### Optional Configuration

- `appName`: The Fly.io app name (defaults to 'lightfast-worker-instances')
- `logger`: A custom Pino logger instance (defaults to built-in logger)

# Optional
NODE_ENV=development
LOG_LEVEL=info
```

## Instance Management

### Create an Instance

```typescript
// Basic instance
const result = await computer.instances.create({
  name: 'my-dev-instance',
  region: 'iad',
  size: 'shared-cpu-1x',
  memoryMb: 512,
});

if (result.isOk()) {
  console.log('Instance created:', result.value.id);
} else {
  console.error('Failed to create instance:', result.error.message);
}

// Instance with GitHub integration
const githubResult = await computer.instances.create({
  name: 'my-github-instance',
  region: 'iad',
  repoUrl: 'https://github.com/user/repo',
  secrets: {
    githubToken: process.env.GITHUB_TOKEN,
    githubUsername: 'myusername',
  },
});
```

### Get Instance Information

```typescript
const result = await computer.instances.get('instance-id');

if (result.isOk()) {
  const instance = result.value;
  console.log(`Instance ${instance.name} is ${instance.status}`);
  console.log(`Region: ${instance.region}`);
  console.log(`Private IP: ${instance.privateIpAddress}`);
}
```

### List All Instances

```typescript
const instances = await computer.instances.list();
console.log(`Found ${instances.length} instances`);

instances.forEach(instance => {
  console.log(`- ${instance.name}: ${instance.status}`);
});
```

### Control Instance Lifecycle

```typescript
// Start a stopped instance
const startResult = await computer.instances.start('instance-id');

// Stop a running instance
const stopResult = await computer.instances.stop('instance-id');

// Restart an instance
const restartResult = await computer.instances.restart('instance-id');

// Destroy an instance (permanent)
const destroyResult = await computer.instances.destroy('instance-id');
```

### Health Check

```typescript
const healthResult = await computer.instances.healthCheck('instance-id');

if (healthResult.isOk()) {
  console.log('Instance is healthy:', healthResult.value);
}
```

### Get Statistics

```typescript
const stats = computer.instances.getStats();
console.log(`Total: ${stats.total}, Running: ${stats.running}, Failed: ${stats.failed}`);
```

## Command Execution

### Execute Commands

```typescript
// Basic command execution
const result = await computer.commands.execute({
  instanceId: 'instance-id',
  command: 'ls',
  args: ['-la'],
});

if (result.isOk()) {
  console.log('Output:', result.value.output);
  console.log('Exit code:', result.value.exitCode);
}

// Command with timeout and streaming
const streamResult = await computer.commands.execute({
  instanceId: 'instance-id',
  command: 'find',
  args: ['/workspace', '-name', '*.js'],
  timeout: 30000, // 30 seconds
  onData: (data) => console.log('STDOUT:', data),
  onError: (error) => console.error('STDERR:', error),
});
```

### Command History

```typescript
// Get command history for an instance
const history = await computer.commands.getHistory('instance-id');

history.forEach(cmd => {
  console.log(`${cmd.startedAt}: ${cmd.command} ${cmd.args.join(' ')}`);
  console.log(`Status: ${cmd.status}, Exit code: ${cmd.exitCode}`);
});

// Clear command history
computer.commands.clearHistory('instance-id');
```

## Error Handling

The SDK uses the `neverthrow` library for error handling. All operations return `Result<T, E>` types:

```typescript
import { ValidationError, InstanceCreationError } from 'lightfast-computer';

const result = await computer.instances.create({ name: 'test' });

// Pattern matching
result.match(
  (instance) => console.log('Success:', instance.id),
  (error) => {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else if (error instanceof InstanceCreationError) {
      console.error('Creation failed:', error.message);
    } else {
      console.error('Unknown error:', error.message);
    }
  }
);

// Or check explicitly
if (result.isOk()) {
  // Success case
  const instance = result.value;
} else {
  // Error case
  const error = result.error;
  
  // Access technical details for debugging
  if (error.technicalDetails) {
    console.error('Technical details:', error.technicalDetails);
    // Contains Fly.io error response, status codes, etc.
  }
}
```

### Error Details

All errors now include technical details for better debugging:

```typescript
const result = await computer.instances.create({ name: 'test' });

if (result.isErr()) {
  const error = result.error;
  
  // User-friendly message
  console.error('Error:', error.message);
  
  // Technical details (when available)
  if (error.technicalDetails) {
    console.error('Status:', error.technicalDetails.status);
    console.error('Fly.io Error:', error.technicalDetails.error);
    console.error('Request Details:', error.technicalDetails.machineConfig);
  }
}
```

## Advanced Usage

### Batch Operations

```typescript
// Create multiple instances in parallel
const createPromises = [
  computer.instances.create({ name: 'instance-1' }),
  computer.instances.create({ name: 'instance-2' }),
  computer.instances.create({ name: 'instance-3' }),
];

const results = await Promise.all(createPromises);
const successful = results.filter(r => r.isOk());
console.log(`Created ${successful.length} instances successfully`);
```

### Command Pipelines

```typescript
const instanceId = 'my-instance';

// Execute a series of commands
const commands = [
  { command: 'pwd', args: [] },
  { command: 'ls', args: ['-la'] },
  { command: 'env', args: [] },
];

for (const cmd of commands) {
  const result = await computer.commands.execute({
    instanceId,
    ...cmd,
  });

  if (result.isOk()) {
    console.log(`${cmd.command}: ${result.value.output}`);
  }
}
```

## TypeScript Support

The SDK is fully typed with TypeScript:

```typescript
import type {
  Instance,
  CreateInstanceOptions,
  ExecuteCommandResult,
  LightfastComputerSDK
} from 'lightfast-computer';

// All types are available for import
const computer: LightfastComputerSDK = createLightfastComputer();

const options: CreateInstanceOptions = {
  name: 'typed-instance',
  region: 'iad',
  size: 'shared-cpu-2x',
};
```

## Security

- Commands are validated against an allowlist: `ls`, `grep`, `find`, `cat`, `echo`, `pwd`, `env`, `ps`, `df`, `du`, `git`
- Instances must be in `running` state to execute commands
- All inputs are validated before execution
- GitHub tokens are securely passed as environment variables

## Error Types

- `ValidationError`: Input validation failed
- `NotFoundError`: Instance not found
- `InstanceCreationError`: Failed to create instance
- `InstanceOperationError`: Failed to perform instance operation
- `InstanceStateError`: Invalid instance state for operation
- `InfrastructureError`: Temporary infrastructure issue
