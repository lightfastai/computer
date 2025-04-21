# Architecture Documentation

## System Overview

The Creative Apps IPC Server is designed as a centralized communication hub for creative applications. It uses a WebSocket-based architecture to enable real-time, bidirectional communication between applications, enhanced with LLM-powered instruction generation and MCP (Model Context Protocol) integration.

## Component Architecture

### 1. LLM Service Layer

The LLM service layer handles instruction generation and command validation:

```mermaid
classDiagram
    class LLMService {
        -model: LLMModel
        -context: Context
        +generateCommands(instruction: string)
        +validateCommands(commands: Command[])
        +updateContext(result: CommandResult)
    }

    class CommandGenerator {
        -templates: Map
        +generate(instruction: string)
        +validate(command: Command)
    }

    class ContextManager {
        -history: History
        +update(result: Result)
        +getContext(): Context
    }

    LLMService --> CommandGenerator
    LLMService --> ContextManager
```

### 2. MCP Integration Layer

The MCP layer manages communication between LLM and applications:

```mermaid
classDiagram
    class MCPServer {
        -servers: Map
        -translator: ProtocolTranslator
        +initializeServers(config: MCPConfig)
        +translateCommand(command: Command)
        +handleResponse(response: Response)
    }

    class ProtocolTranslator {
        -protocols: Map
        +translate(command: Command)
        +validate(protocol: Protocol)
    }

    class ApplicationBridge {
        -app: Application
        +execute(command: Command)
        +handleResponse(response: Response)
    }

    MCPServer --> ProtocolTranslator
    MCPServer --> ApplicationBridge
```

### 3. Central Server

The central server manages all communications:

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
        -llmService: LLMService
        -mcpServer: MCPServer
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
    CreativeAppsServer --> LLMService
    CreativeAppsServer --> MCPServer
```

### 4. Application Bridges

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

### 5. Clients

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

### 1. Context Management Layer

The context management layer handles state and relationships across multiple applications:

```mermaid
classDiagram
    class ContextManager {
        -activeProjects: Map
        -applicationStates: Map
        -relationships: Graph
        +updateContext(app: string, state: State)
        +getRelatedContext(app: string)
        +trackRelationship(source: string, target: string)
    }

    class ProjectContext {
        -id: string
        -applications: Set
        -timeline: Timeline
        -relationships: Map
        +addApplication(app: string)
        +updateTimeline(time: number)
        +getSynchronizedState()
    }

    class ApplicationState {
        -app: string
        -currentState: State
        -history: History
        -dependencies: Set
        +updateState(newState: State)
        +getDependencies()
    }

    ContextManager --> ProjectContext
    ContextManager --> ApplicationState
```

### 2. Cross-Application Synchronization

```mermaid
sequenceDiagram
    participant User
    participant Context
    participant Apps
    participant LLM

    User->>Context: Start Multi-App Project
    Context->>Apps: Initialize States

    loop Creative Process
        User->>LLM: Natural Language Instruction
        LLM->>Context: Analyze Context
        Context->>Apps: Synchronize States

        par Parallel Execution
            Apps->>Context: Update States
            Context->>LLM: Update Context
        end

        LLM->>User: Provide Feedback
    end
```

### 3. State Management

The system maintains several types of state:

1. **Project State**
   - Active applications
   - Timeline synchronization
   - Cross-application dependencies
   - Project metadata

2. **Application State**
   - Current operation mode
   - Active elements
   - Parameter values
   - Operation history

3. **Relationship State**
   - Data flow between applications
   - Synchronization points
   - Dependency chains
   - Event triggers

### 4. Context-Aware Instruction Generation

The LLM service uses context to generate appropriate commands:

```typescript
interface ContextAwareLLM {
  // Generate commands considering all active applications
  generateMultiAppCommands(
    instruction: string,
    context: ProjectContext
  ): Promise<Command[]>;

  // Validate commands against current state
  validateMultiAppCommands(
    commands: Command[],
    context: ProjectContext
  ): Promise<ValidationResult>;

  // Update context based on execution results
  updateProjectContext(
    results: CommandResult[],
    context: ProjectContext
  ): Promise<void>;
}
```

### 5. Example Workflow: Music-Visual Creation

```mermaid
graph TB
    subgraph "Ableton Live"
        A1[Create Track]
        A2[Add Effects]
        A3[Export Audio]
    end

    subgraph "Blender"
        B1[Create Scene]
        B2[Animate Objects]
        B3[Render Frames]
    end

    subgraph "TouchDesigner"
        T1[Load Audio]
        T2[Create Visuals]
        T3[Sync with Music]
    end

    A1 --> A2 --> A3
    A3 --> T1
    B1 --> B2 --> B3
    T1 --> T2 --> T3
    T3 --> B2
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
    participant User
    participant LLM
    participant MCP
    participant Server
    participant Bridge
    participant App

    User->>LLM: Send Instruction
    LLM->>MCP: Generate Commands
    MCP->>Server: Translate Commands
    Server->>Bridge: Forward Commands
    Bridge->>App: Execute Commands
    App->>Bridge: Return Results
    Bridge->>Server: Forward Results
    Server->>MCP: Process Results
    MCP->>LLM: Update Context
    LLM->>User: Send Response
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

## Configuration

The system uses a comprehensive configuration system:

```typescript
interface SystemConfig {
  llm: {
    provider: 'claude' | 'openai';
    model: string;
    apiKey: string;
  };
  mcp: {
    servers: {
      [app: string]: {
        type: string;
        config: MCPConfig;
      };
    };
  };
  applications: {
    [app: string]: {
      bridge: string;
      capabilities: string[];
    };
  };
}
```
