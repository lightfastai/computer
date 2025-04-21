# Development Guide

## Development Environment Setup

### Prerequisites

1. Node.js Environment
```bash
# Install Node.js 18+ or Deno 1.30+
node --version  # Should be >= 18.0.0
```

2. Creative Applications
- Blender 3.0+
- TouchDesigner 2022+
- Ableton Live 11+

3. Development Tools
```bash
# Install development dependencies
npm install -g typescript
npm install -g ts-node
npm install -g nodemon
```

### Project Setup

1. Clone the Repository
```bash
git clone https://github.com/yourusername/creative-apps-ipc.git
cd creative-apps-ipc
```

2. Install Dependencies
```bash
npm install
```

3. Build the Project
```bash
npm run build
```

## Development Workflow

### 1. Starting the Development Environment

#### Standard Approach
```bash
# Start the central server in development mode
npm run dev

# Start application bridges (in separate terminals)
npm run dev:bridge:blender
npm run dev:bridge:td
npm run dev:bridge:ableton
```

#### Simplified Approach
```bash
# Start the Node/Deno server
npm run dev:simple

# The server will automatically spawn Python scripts for each application
```

### 2. Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "blender"
npm test -- --grep "touchdesigner"
npm test -- --grep "ableton"

# Run tests with coverage
npm run test:coverage
```

### 3. Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check
```

## Adding New Features

### 1. Creating a New Bridge

#### Standard Approach
1. Create Bridge Class
```typescript
// src/bridges/my-app-bridge.ts
import { BaseBridge } from './base-bridge';

export class MyAppBridge extends BaseBridge {
  constructor() {
    super('my-app');
  }

  async start() {
    // Implementation
  }

  async stop() {
    // Implementation
  }

  async handleMessage(message: Message) {
    // Implementation
  }
}
```

2. Register Bridge
```typescript
// src/server.ts
import { MyAppBridge } from './bridges/my-app-bridge';

// Add to bridge registry
bridgeRegistry.register('my-app', new MyAppBridge());
```

#### Simplified Approach
1. Create Python Script
```python
# scripts/my_app_script.py
import websockets
import json
import sys
import my_app_api  # Application-specific API

async def handle_command(command):
    # Parse command
    cmd_type = command.get('type')
    params = command.get('params', {})

    # Execute command using application API
    if cmd_type == 'custom_method':
        result = my_app_api.custom_method(**params)
        return {'success': True, 'result': result}

    return {'success': False, 'error': 'Unknown command'}

async def main():
    uri = "ws://localhost:3000/my_app"
    async with websockets.connect(uri) as websocket:
        while True:
            command = await websocket.recv()
            response = await handle_command(json.loads(command))
            await websocket.send(json.dumps(response))

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

2. Register Script in Node/Deno Server
```typescript
// src/simple-server.ts
import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';

const scripts = {
  'my-app': {
    path: './scripts/my_app_script.py',
    process: null
  }
};

// Start script when server starts
function startScript(appName) {
  const script = scripts[appName];
  script.process = spawn('python', [script.path]);

  script.process.stdout.on('data', (data) => {
    console.log(`${appName} stdout: ${data}`);
  });

  script.process.stderr.on('data', (data) => {
    console.error(`${appName} stderr: ${data}`);
  });
}

// Start all scripts
Object.keys(scripts).forEach(startScript);
```

### 2. Creating a New Client

#### Standard Approach
1. Create Client Interface
```typescript
// src/types/my-app-client.ts
export interface MyAppClient extends BaseClient {
  // Add application-specific methods
  customMethod(): Promise<void>;
}
```

2. Implement Client
```typescript
// src/clients/my-app-client.ts
import { BaseClient } from './base-client';
import { MyAppClient } from '../types/my-app-client';

export class MyAppClientImpl extends BaseClient implements MyAppClient {
  async customMethod(): Promise<void> {
    // Implementation
  }
}
```

#### Simplified Approach
```typescript
// src/simple-clients/my-app-client.ts
export class MyAppClient {
  private ws: WebSocket;

  constructor(serverUrl: string) {
    this.ws = new WebSocket(`${serverUrl}/my_app`);
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.ws.onopen = () => {
      console.log('Connected to MyApp');
    };

    this.ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      // Handle response
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  public async customMethod(params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = Date.now().toString();

      const messageHandler = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.messageId === messageId) {
          this.ws.removeEventListener('message', messageHandler);
          if (response.success) {
            resolve(response.result);
          } else {
            reject(new Error(response.error));
          }
        }
      };

      this.ws.addEventListener('message', messageHandler);

      this.ws.send(JSON.stringify({
        type: 'custom_method',
        params,
        messageId
      }));
    });
  }
}
```

## Debugging

### 1. Server Debugging

```bash
# Start server with debugger
npm run debug:server

# Attach debugger in VS Code
# Add to launch.json:
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Server",
  "port": 9229
}
```

### 2. Bridge/Python Script Debugging

#### Standard Approach
```bash
# Start bridge with debugger
npm run debug:bridge:blender

# Add to launch.json:
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Bridge",
  "port": 9230
}
```

#### Simplified Approach
```bash
# Debug Python script
python -m pdb scripts/my_app_script.py

# Or use VS Code Python debugger
# Add to launch.json:
{
  "name": "Python: MyApp Script",
  "type": "python",
  "request": "launch",
  "program": "${workspaceFolder}/scripts/my_app_script.py",
  "console": "integratedTerminal"
}
```

### 3. Client Debugging

```typescript
// Enable debug logging
const client = new BlenderClient({
  debug: true
});
```

## Performance Optimization

### 1. Message Queue Optimization

```typescript
// Configure message queue
const queue = new MessageQueue({
  maxSize: 1000,
  batchSize: 10,
  processingInterval: 100
});
```

### 2. Connection Pooling

```typescript
// Configure connection pool
const pool = new ConnectionPool({
  minSize: 5,
  maxSize: 20,
  idleTimeout: 30000
});
```

### 3. Caching

```typescript
// Configure cache
const cache = new Cache({
  maxSize: 1000,
  ttl: 3600000
});
```

## Deployment

### 1. Production Build

```bash
# Create production build
npm run build:prod

# Start production server
npm run start:prod
```

### 2. Docker Deployment

#### Standard Approach
```bash
# Build Docker image
docker build -t creative-apps-ipc .

# Run container
docker run -p 3000:3000 creative-apps-ipc
```

#### Simplified Approach
```bash
# Build Docker image with Python scripts
docker build -t creative-apps-ipc-simple -f Dockerfile.simple .

# Run container
docker run -p 3000:3000 creative-apps-ipc-simple
```

### 3. Environment Configuration

```bash
# Create .env file
cp .env.example .env

# Edit .env file with your settings
```

## Choosing Between Approaches

### When to Use the Standard Approach

- Complex applications with many features
- Need for tight integration with application APIs
- Requirements for high performance and low latency
- Large teams with specialized knowledge

### When to Use the Simplified Approach

- Prototyping and proof-of-concept development
- Small to medium-sized projects
- Limited resources or time constraints
- Need for quick iteration and development
- Applications with simple integration requirements

## Troubleshooting

### Common Issues

1. Connection Issues
```bash
# Check server status
npm run status

# Check bridge status
npm run status:bridges
```

2. Performance Issues
```bash
# Monitor performance
npm run monitor

# Generate performance report
npm run report:performance
```

3. Memory Issues
```bash
# Check memory usage
npm run check:memory

# Generate memory report
npm run report:memory
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

### Pull Request Process

1. Update documentation
2. Add tests for new features
3. Ensure all tests pass
4. Update the changelog
5. Request review from maintainers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
