# Logger Interface Documentation

This document describes the logger interface abstraction introduced to decouple the SDK from Pino, allowing users to provide their own logging implementations.

## Overview

The SDK now uses a generic `Logger` interface instead of directly depending on Pino. This provides several benefits:

1. **Flexibility**: Users can provide their own logger implementations
2. **Framework Independence**: No hard dependency on Pino for consumers
3. **Testing**: Easier to mock and test logging behavior
4. **Compatibility**: Works with any logging framework that implements the interface

## Logger Interface

```typescript
interface Logger {
  info(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  level: string;
}
```

### Logger Configuration

```typescript
interface LoggerConfig {
  level?: string;        // Log level (e.g., 'info', 'debug', 'error')
  silent?: boolean;      // Whether to suppress all output
}

type LoggerFactory = (config?: LoggerConfig) => Logger;
```

## SDK Integration

### Basic Usage with Default Logger

```typescript
import { createLightfastComputer } from '@lightfastai/computer';

// Uses default Pino logger
const computer = createLightfastComputer({
  flyApiToken: 'your_token'
});
```

### Custom Logger Implementation

```typescript
import { createLightfastComputer, type Logger } from '@lightfastai/computer';

// Custom logger implementation
const myLogger: Logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    console.debug(`[DEBUG] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  level: 'info'
};

const computer = createLightfastComputer({
  flyApiToken: 'your_token',
  logger: myLogger
});
```

### Using Pino with Custom Configuration

```typescript
import { createLightfastComputer, createPinoLogger } from '@lightfastai/computer';

// Create Pino logger with custom config
const pinoLogger = createPinoLogger({
  level: 'debug',
  silent: false
});

const computer = createLightfastComputer({
  flyApiToken: 'your_token',
  logger: pinoLogger
});
```

## Built-in Implementations

### Pino Logger Adapter

The SDK includes a Pino adapter that implements the Logger interface:

```typescript
import { createPinoLogger } from '@lightfastai/computer';

const logger = createPinoLogger({
  level: 'debug',
  silent: false
});
```

### Default Logger Factory

The `createLogger` function automatically detects test environments and configures appropriate logging:

```typescript
import { createLogger } from '@lightfastai/computer';

// Automatically silent during tests, info level otherwise
const logger = createLogger();

// With custom config
const logger = createLogger({
  level: 'debug',
  silent: false
});
```

## Framework-Specific Examples

### Winston Logger

```typescript
import winston from 'winston';
import { createLightfastComputer, type Logger } from '@lightfastai/computer';

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

// Adapter to match Logger interface
const winstonAdapter: Logger = {
  info: (message: string, ...args: unknown[]) => winstonLogger.info(message, ...args),
  error: (message: string, ...args: unknown[]) => winstonLogger.error(message, ...args),
  debug: (message: string, ...args: unknown[]) => winstonLogger.debug(message, ...args),
  warn: (message: string, ...args: unknown[]) => winstonLogger.warn(message, ...args),
  level: winstonLogger.level
};

const computer = createLightfastComputer({
  flyApiToken: 'your_token',
  logger: winstonAdapter
});
```

### Console Logger

```typescript
import { createLightfastComputer, type Logger } from '@lightfastai/computer';

const consoleLogger: Logger = {
  info: console.log.bind(console, '[INFO]'),
  error: console.error.bind(console, '[ERROR]'),
  debug: console.debug.bind(console, '[DEBUG]'),
  warn: console.warn.bind(console, '[WARN]'),
  level: 'info'
};

const computer = createLightfastComputer({
  flyApiToken: 'your_token',
  logger: consoleLogger
});
```

### Silent Logger (for Testing)

```typescript
import { createLightfastComputer, type Logger } from '@lightfastai/computer';

const silentLogger: Logger = {
  info: () => {},
  error: () => {},
  debug: () => {},
  warn: () => {},
  level: 'silent'
};

const computer = createLightfastComputer({
  flyApiToken: 'your_token',
  logger: silentLogger
});
```

## Logging Patterns Used by SDK

The SDK uses structured logging patterns that your logger should support:

### Simple Messages
```typescript
logger.info('Instance created successfully');
logger.error('Failed to create instance');
```

### Messages with Context Objects
```typescript
logger.info('Creating Fly machine', { 
  name: 'instance-name', 
  size: 'shared-cpu-2x' 
});

logger.error('Failed to execute command via REST API', {
  status: 404,
  error: 'Machine not found',
  instanceId: 'abc123'
});
```

### Debug Information
```typescript
logger.debug('Waiting for machine', { 
  machineId: 'fly-123', 
  currentState: 'starting' 
});
```

## Migration from Direct Pino Usage

If you were previously importing Pino types directly, update your imports:

### Before
```typescript
import type { Logger } from 'pino';
```

### After
```typescript
import type { Logger } from '@lightfastai/computer';
```

The interface is compatible, so existing code should work without changes.

## Testing

When testing with the new logger interface:

```typescript
import { describe, expect, it, mock } from 'bun:test';
import { createLightfastComputer, type Logger } from '@lightfastai/computer';

describe('My Test', () => {
  it('should log operations', () => {
    const mockLogger: Logger = {
      info: mock(),
      error: mock(),
      debug: mock(),
      warn: mock(),
      level: 'info'
    };

    const computer = createLightfastComputer({
      flyApiToken: 'test-token',
      logger: mockLogger
    });

    // Your test code here
    
    expect(mockLogger.info).toHaveBeenCalledWith('Expected message');
  });
});
```

## Best Practices

1. **Log Levels**: Respect the `level` property when implementing custom loggers
2. **Performance**: Consider performance implications for high-frequency debug logs
3. **Security**: Avoid logging sensitive information like API tokens
4. **Structured Data**: Support both simple messages and structured context objects
5. **Error Handling**: Ensure logging operations don't throw exceptions

## Type Safety

All logger interfaces are fully typed with TypeScript:

```typescript
import type { 
  Logger, 
  LoggerConfig, 
  LoggerFactory 
} from '@lightfastai/computer';

// Type-safe logger implementation
const myLogger: Logger = {
  // Implementation must match interface exactly
};
```