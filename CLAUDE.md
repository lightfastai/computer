# Claude AI Assistant Guide

This guide provides instructions for Claude AI assistants working on the Lightfast Computer project - a Fly.io instance management system with Inngest-powered background processing.

## Quick Start Commands

```bash
# Development workflow
bun test --watch        # Run tests continuously during development
bun run build         # Check for TypeScript compilation errors
bun run lint          # Check code style with Biome
bun run typecheck     # Verify TypeScript types
bun dev               # Start development server

# Testing the API
curl http://localhost:3000/health
curl http://localhost:3000/api/instances
```

## Project Context

This system enables users to create and manage Ubuntu instances on Fly.io using reliable background processing with Inngest. The focus is on instance lifecycle management without SSH or workflow capabilities.

### Fly.io Deployment Details
- **App**: `lightfast-worker-instances` (where Ubuntu instances run)
- **Organization**: `lightfast`
- **Primary Region**: `iad` (US East)
- **Configuration**: See `fly.toml` for deployment configuration

### Important Implementation Notes
- The Fly.io app name is hardcoded in `fly-service.ts` as `lightfast-worker-instances`
- Instances are created without public IPs (only private IPv6 addresses)
- No SSH functionality - instances are managed through Fly.io Machines API only

## Claude AI Best Practices

### Communication Guidelines
- **Be concise**: Keep responses short (fewer than 4 lines) unless detail is requested
- **Be direct**: Answer the user's question without unnecessary preamble
- **Be proactive**: Take actions when asked, but don't surprise users with unexpected changes
- **Use tools effectively**: Batch tool calls when possible for better performance

### Development Approach
- **Read first**: Always use Read tool before editing files to understand context
- **Follow conventions**: Mimic existing code style and patterns in the codebase
- **Test continuously**: Run tests frequently during development
- **Verify changes**: Use build/lint commands to catch errors early

## Key Architecture Decisions

### Technology Stack
- **Hono**: Lightweight web framework with excellent TypeScript support
- **Bun**: Fast runtime with built-in TypeScript support and testing
- **Fly.io Machines API**: For on-demand Ubuntu compute instances
- **Inngest**: Reliable background job processing with retries

### Project Structure
```
/
├── src/
│   ├── api/           # API routes and handlers (instances, monitoring)
│   ├── services/      # Business logic (fly-service, instance-service)
│   ├── lib/           # Shared utilities (config, error-handler)
│   ├── inngest/       # Background job functions
│   ├── schemas/       # Zod validation schemas
│   └── index.ts       # Entry point with Hono app and Inngest
├── tests/             # Test files (using bun:test)
└── config files       # biome.json, tsconfig.json, fly.toml
```

## Development Patterns

### API Design
- RESTful endpoints for instance management (`/api/instances`)
- No authentication required (open for development)
- Request validation using Zod schemas
- Consistent error handling with proper HTTP status codes
- Response typing with TypeScript interfaces

### Error Handling
```typescript
// Use custom error classes from error-handler.ts
import { AppError, NotFoundError, ValidationError } from '@/lib/error-handler';

export const getInstance = async (id: string) => {
  const instance = instances.get(id);
  if (!instance) {
    throw new NotFoundError('Instance', id);
  }
  return instance;
};

// Errors are handled by the global errorHandler middleware
```

### Functional Programming Pattern
- **No classes allowed** - use pure functions and module-level state
- Keep functions small and focused
- Business logic in service modules with exported functions
- Module-level state for data persistence

## Key Implementation Areas

### 1. Instance Management (`src/services/instance-service.ts`)
- Create, start, stop, restart, destroy instances
- Module-level Map for in-memory state storage
- Sync instance status with Fly.io API
- Health checking and statistics

### 2. Fly.io Integration (`src/services/fly-service.ts`)
- Use Machines API v2 for Ubuntu instances
- Implement proper error handling for API failures
- Machine size parsing and configuration
- Region selection (defaults to `iad`)

### 3. Inngest Background Processing (`src/inngest/`)
- Instance lifecycle functions with automatic retries
- Reliable background job processing
- Built-in monitoring and observability
- Failure handling with step functions

## Testing Requirements

**Claude should run these commands frequently during development:**

```bash
# Test-Driven Development workflow
bun test --watch    # Run tests continuously (recommended during development)
bun test           # Run all tests once
bun run build      # Check for TypeScript compilation errors
bun run lint       # Check code style with Biome
bun run typecheck  # Verify TypeScript types
```

**Important**: Claude must run `bun run build` frequently to catch TypeScript compilation errors early. Build errors often reveal type issues that might not be caught by the language server.

### Test Framework: Bun Test
- All tests use `bun:test` (not vitest)
- Import syntax: `import { describe, expect, it, beforeEach, spyOn } from 'bun:test';`
- Mock external dependencies with `spyOn` from bun:test
- Test files in `tests/` directory mirroring `src/` structure

### Test Coverage Areas
- API endpoint integration tests (`tests/api/`)
- Service unit tests (`tests/services/`)
- Instance lifecycle and error handling scenarios

## Security Considerations

1. **Open API**: Currently no authentication required (development mode)
2. **Input Validation**: All inputs validated with Zod schemas
3. **Environment Variables**: Store sensitive tokens in `.env` (never commit)
4. **Instance Isolation**: Fly.io provides natural isolation between machines

## Common Development Tasks

### Adding a New API Endpoint
1. **Write tests first** in `tests/api/`
2. Define route in `src/api/routes.ts`
3. Create handler function in appropriate API file
4. Add service function if needed in `src/services/`
5. Run `bun test` and `bun run build` to verify

### Adding Instance Functionality
1. **Write tests first** in `tests/services/instance-service.test.ts`
2. Add function to `src/services/instance-service.ts`
3. Create Inngest function in `src/inngest/instance-functions.ts` if background processing needed
4. Update API routes to expose functionality
5. Run tests continuously with `bun test --watch`

### Implementing a New Feature
1. **Start with tests** (TDD approach)
2. Implement service layer functions (no classes)
3. Add API endpoints
4. Write comprehensive tests for all scenarios
5. Ensure `bun run build` passes without errors

## Environment Variables

```env
# Required
FLY_API_TOKEN=your_fly_api_token
FLY_ORG_SLUG=lightfast
INNGEST_EVENT_KEY=your_inngest_event_key

# Optional
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

## Debugging Tips

1. Use structured logging with Pino (`src/lib/error-handler.ts`)
2. Check Fly.io machine states with `fly machines list`
3. Monitor Inngest function execution in dashboard
4. Use `bun run build` to catch TypeScript errors

## Performance Considerations

1. In-memory state storage with Map (no database)
2. Fly.io API calls are cached at service level
3. Inngest provides automatic retries and rate limiting
4. Instances auto-sleep when idle (Fly.io feature)

## Deployment

```bash
# Deploy to Fly.io
fly deploy

# Check status
fly status
fly logs

# List instances
fly machines list -a lightfast-worker-instances
```

## Functional Programming Guidelines

**Claude must strictly follow functional programming principles:**

```typescript
// ❌ BAD: Don't use classes
export class UserService {
  private users: Map<string, User> = new Map();
  async createUser(data: CreateUserDto): Promise<User> { /* ... */ }
}

// ✅ GOOD: Use pure functions and module-level state
const users = new Map<string, User>();

export const createUser = async (data: CreateUserDto): Promise<User> => {
  // ...
};

export const clearAllUsers = (): void => {
  users.clear(); // For testing
};
```

### Code Style Requirements
- **No classes allowed** - use pure functions and module-level state only
- Use TypeScript strict mode with all strict options enabled
- Keep functions small and focused (single responsibility)
- Use meaningful variable names and function names
- **No comments** unless complex logic requires explanation

### Import Guidelines

**Always use `@/*` path alias for imports:**

```typescript
// ❌ BAD: Don't use relative imports
import { config } from '../lib/config';

// ✅ GOOD: Use @/* path alias
import { config } from '@/lib/config';
import { createInstance } from '@/services/instance-service';
```

**Import directly from source files (no index.ts re-exports):**

```typescript
// ✅ GOOD: Direct imports
import { createInstance, destroyInstance } from '@/inngest/instance-functions';
import { NotFoundError } from '@/lib/error-handler';
```

## Test-Driven Development

**Claude must write tests first and run them continuously:**

### TDD Workflow for Claude
1. **Write failing tests first** in `tests/` directory
2. **Run `bun test --watch`** to see tests fail
3. **Implement code** to make tests pass
4. **Run `bun run build`** to check TypeScript compilation
5. **All tests pass before moving to next task**

### Test Framework: Bun Test
```typescript
import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import * as flyService from '@/services/fly-service';
import * as instanceService from '@/services/instance-service';

describe('instance-service', () => {
  beforeEach(() => {
    // Clear module state for clean tests
    instanceService.clearAllInstances();
  });

  it('should create instance successfully', async () => {
    const mockMachine = { id: 'fly-123', state: 'started' };
    const mockCreateMachine = spyOn(flyService, 'createMachine');
    mockCreateMachine.mockResolvedValue(mockMachine);

    const instance = await instanceService.createInstance({ name: 'test' });

    expect(instance.flyMachineId).toBe('fly-123');
    expect(flyService.createMachine).toHaveBeenCalled();
  });
});
```

### Essential Commands
```bash
bun test --watch    # Run continuously (Claude should use this)
bun test           # Run all tests once
bun run build      # Check TypeScript errors (run frequently)
```

## Essential Commands for Claude

```bash
# Development Workflow
bun test --watch        # Run tests continuously (primary command)
bun test               # Run all tests once
bun run build          # Check TypeScript compilation (run frequently)
bun run lint           # Check code style with Biome
bun run typecheck      # Verify TypeScript types
bun dev                # Start development server (port 3000)

# API Testing
curl http://localhost:3000/health
curl http://localhost:3000/api/instances
curl -X POST http://localhost:3000/api/instances \
  -H "Content-Type: application/json" \
  -d '{"name":"test-instance","region":"iad"}'

# Dependencies
bun add <package>      # Add production dependency
bun add -d <package>   # Add dev dependency
bun install            # Install from lockfile

# Deployment
fly deploy             # Deploy to Fly.io
fly logs               # View logs
fly machines list -a lightfast-worker-instances
```

## Key Dependencies

- **hono**: Lightweight web framework with TypeScript support
- **@hono/zod-validator**: Request validation middleware
- **pino**: Structured logging
- **zod**: Schema validation and TypeScript type inference
- **inngest**: Reliable background job processing with retries
- **@anthropic-ai/sdk**: (MCP server functionality)

## Common Issues & Solutions

### Fly.io Errors
- "app not found": Run `fly apps create lightfast-worker-instances --org lightfast`
- "invalid token": Get fresh token with `fly auth token`
- Instances stop when idle: This is normal Fly.io behavior

### Development Issues
- **Port conflicts**: Default port is 3000, kill existing: `kill -9 $(lsof -ti:3000)`
- **TypeScript errors**: Run `bun run build` frequently to catch compilation issues
- **Test failures**: Fix immediately, don't proceed with failing tests

### API Issues
- **No authentication**: API is open for development (no auth middleware)
- **Validation errors**: All inputs validated with Zod schemas in `src/schemas/`
