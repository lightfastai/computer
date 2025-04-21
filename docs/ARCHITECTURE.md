# Architecture Documentation

## System Overview

The Creative Apps IPC Server is designed as a centralized communication hub for creative applications. It uses a WebSocket-based architecture to enable real-time, bidirectional communication between applications.

## Component Architecture

### 1. Central Server

The central server is the core component that manages all communications. It consists of:

- HTTP Server for REST API endpoints
- WebSocket Server for real-time communication
- Message Queue for handling asynchronous operations
- Connection Manager for tracking application states

```mermaid
classDiagram
    class CreativeAppsServer {
        -applications: Map
        -httpServer: Server
        -wsServer: WebSocketServer
        +start()
        -setupWebSocketServer()
        -handleMessage()
        -handleDisconnection()
    }

    class MessageQueue {
        -queue: Queue
        +enqueue()
        +dequeue()
        +process()
    }

    class ConnectionManager {
        -connections: Map
        +addConnection()
        +removeConnection()
        +getConnection()
    }

    CreativeAppsServer --> MessageQueue
    CreativeAppsServer --> ConnectionManager
```

### 2. Application Bridges

Bridges are application-specific components that handle the translation between the central server's protocol and each application's native API.

#### Blender Bridge
- Uses Python API
- Handles scene manipulation
- Manages object creation and modification
- Controls rendering settings

#### TouchDesigner Bridge
- Uses Python API
- Manages node creation and connections
- Controls parameter values
- Handles texture updates

#### Ableton Bridge
- Uses MIDI/OSC protocol
- Controls transport (play, stop, etc.)
- Manages clip launching
- Handles parameter automation

### 3. Clients

TypeScript clients provide type-safe interfaces for interacting with each application:

```typescript
interface BaseClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: Message): Promise<Response>;
}

interface BlenderClient extends BaseClient {
  executePython(code: string): Promise<void>;
  createObject(type: string, params: ObjectParams): Promise<void>;
  updateScene(data: SceneData): Promise<void>;
}
```

## Alternative Simplified Architecture

For simpler implementations or prototyping, an alternative approach uses standalone Python scripts that are executed and managed by Node/Deno. This approach reduces complexity while maintaining the core functionality.

### 1. Standalone Python Scripts

Each creative application has a dedicated Python script that:
- Connects to the Node/Deno server via WebSocket
- Receives commands and executes them in the application
- Returns results back to the server

### 2. Node/Deno Process Manager

The Node/Deno server:
- Spawns and manages Python script processes
- Handles WebSocket communication with clients
- Forwards commands to the appropriate Python script
- Returns results to clients

```mermaid
graph TB
    subgraph "Node/Deno Server"
        NS[Node Server]
        CP[Child Process Manager]
    end

    subgraph "Python Scripts"
        BS[Blender Script]
        TS[TouchDesigner Script]
        AS[Ableton Script]
    end

    subgraph "Creative Applications"
        B[Blender]
        TD[TouchDesigner]
        A[Ableton]
    end

    NS --> CP
    CP --> BS
    CP --> TS
    CP --> AS

    BS --> B
    TS --> TD
    AS --> A
```

### 3. Simplified Client Library

The client library provides a simple interface for interacting with the creative applications:

```typescript
class BlenderClient {
  private ws: WebSocket;

  constructor(serverUrl: string) {
    this.ws = new WebSocket(serverUrl);
    this.setupWebSocket();
  }

  public async executePython(code: string): Promise<any> {
    // Send code to server, which forwards to Python script
    // Return result from Blender
  }
}
```

### Benefits of the Simplified Approach

1. **Reduced Complexity**: No need for complex bridge architecture
2. **Easier Development**: Python scripts can be developed and tested independently
3. **Faster Prototyping**: Quick iteration on application-specific functionality
4. **Simplified Maintenance**: Each component has a clear, focused responsibility
5. **Flexible Deployment**: Python scripts can be updated without changing the Node/Deno code

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Bridge
    participant App

    Client->>Server: WebSocket Connection
    Server->>Bridge: Initialize Connection
    Bridge->>App: Start Bridge Process

    Client->>Server: Send Command
    Server->>Bridge: Forward Command
    Bridge->>App: Execute Command
    App->>Bridge: Return Result
    Bridge->>Server: Forward Result
    Server->>Client: Send Response
```

### Simplified Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant PythonScript
    participant App

    Client->>Server: WebSocket Connection
    Server->>PythonScript: Start Python Process

    Client->>Server: Send Command
    Server->>PythonScript: Forward Command
    PythonScript->>App: Execute Command
    App->>PythonScript: Return Result
    PythonScript->>Server: Forward Result
    Server->>Client: Send Response
```

## State Management

The system maintains state for:
- Connection status
- Application capabilities
- Active operations
- Error states

```mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> Connected
    Connected --> Processing
    Processing --> Connected
    Connected --> Disconnected
    Disconnected --> [*]

    state Connected {
        [*] --> Idle
        Idle --> Executing
        Executing --> Idle
    }
```

## Error Handling

The system implements a comprehensive error handling strategy:

1. Connection Errors
   - Automatic reconnection attempts
   - Exponential backoff
   - Maximum retry limits

2. Command Errors
   - Validation before execution
   - Timeout handling
   - Error reporting to clients

3. Application Errors
   - Graceful degradation
   - State recovery
   - Error logging

## Security Considerations

1. Authentication
   - WebSocket connection authentication
   - Command authorization
   - Application-specific credentials

2. Data Validation
   - Input sanitization
   - Type checking
   - Schema validation

3. Rate Limiting
   - Per-client limits
   - Per-command limits
   - Burst protection

## Performance Considerations

1. Message Queue
   - Priority queuing
   - Batch processing
   - Load balancing

2. Connection Management
   - Connection pooling
   - Keep-alive mechanisms
   - Resource cleanup

3. Caching
   - Response caching
   - State caching
   - Command result caching

## Monitoring and Logging

1. Metrics
   - Connection counts
   - Message rates
   - Error rates
   - Response times

2. Logging
   - Structured logging
   - Log levels
   - Log rotation

3. Alerts
   - Error thresholds
   - Performance degradation
   - Connection loss

## Extension Points

The architecture is designed to be extensible:

1. New Applications
   - Bridge interface
   - Client interface
   - Message types

2. New Features
   - Plugin system
   - Command handlers
   - State managers

3. New Protocols
   - Transport layer abstraction
   - Protocol adapters
   - Message translators
