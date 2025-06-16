# AI Assistant Development Guide

This guide provides instructions for AI assistants working on the Fly.io Workflow Orchestrator project.

## Project Context

This system enables users to create and manage Ubuntu instances on Fly.io, execute SSH commands, and build complex workflows. Think of it as "Infrastructure as Code" meets "Workflow Automation" with a focus on developer productivity.

### Fly.io Deployment Details
- **Orchestrator App**: `lightfast-workflow-orchestrator` (the API server)
- **Worker App**: `lightfast-worker-instances` (where Ubuntu instances run)
- **Organization**: `lightfast`
- **Primary Region**: `iad` (US East)
- **Configuration**: See `fly.toml` for deployment configuration

### Important Implementation Notes
- The Fly.io app name is hardcoded in `fly-service.ts` as `lightfast-worker-instances`
- Instances are created without public IPs (only private IPv6 addresses)
- SSH connections require public IP allocation (not yet implemented)

## Key Architecture Decisions

### Technology Stack
- **Hono**: Chosen for its lightweight nature and excellent TypeScript support
- **Bun**: Fast runtime with built-in TypeScript support
- **Fly.io Machines API**: For on-demand compute instances
- **SSH2**: For secure command execution

### Project Structure
```
/
├── src/
│   ├── api/           # API routes and handlers
│   ├── services/      # Business logic
│   ├── lib/           # Shared utilities
│   ├── workflows/     # Workflow definitions
│   └── index.ts       # Entry point
├── tests/             # Test files
├── scripts/           # Build and deployment scripts
└── config/            # Configuration files
```

## Development Patterns

### API Design
- RESTful endpoints with clear resource naming
- Consistent error handling with proper HTTP status codes
- Request validation using Zod schemas
- Response typing with TypeScript interfaces

### Error Handling
```typescript
// Always use typed errors
class InstanceNotFoundError extends Error {
  constructor(id: string) {
    super(`Instance ${id} not found`);
    this.name = 'InstanceNotFoundError';
  }
}

// Handle errors consistently
try {
  // operation
} catch (error) {
  if (error instanceof InstanceNotFoundError) {
    return c.json({ error: error.message }, 404);
  }
  // log unexpected errors
  console.error('Unexpected error:', error);
  return c.json({ error: 'Internal server error' }, 500);
}
```

### Service Layer Pattern
- Keep API routes thin
- Business logic in service classes
- Dependency injection for testability

## Key Implementation Areas

### 1. Fly.io Integration
- Use Machines API v2
- Implement proper error handling for API failures
- Cache machine states to reduce API calls
- Handle region selection intelligently

### 2. SSH Management
- Store SSH keys securely (never in code)
- Implement connection pooling
- Handle connection timeouts gracefully
- Support both exec and interactive shell modes

### 3. Workflow Engine
- Design workflows as composable steps
- Support async operations
- Implement proper state management
- Enable workflow persistence for long-running tasks

### 4. Inngest Integration
- Background job processing with automatic retries
- Step-by-step workflow execution with checkpoints
- Built-in monitoring and observability
- Failure handling and alerting
- Rate limiting and throttling

## Testing Requirements

Run tests before committing:
```bash
bun test
bun run lint
bun run typecheck
```

### Test Coverage Areas
- API endpoint integration tests
- Service unit tests
- Workflow execution tests
- Error handling scenarios

## Security Considerations

1. **Authentication**: Implement API key authentication for all endpoints
2. **SSH Keys**: Use environment variables, never hardcode
3. **Input Validation**: Sanitize all user inputs, especially for SSH commands
4. **Rate Limiting**: Implement to prevent abuse
5. **Instance Isolation**: Ensure users can only access their own instances

## Common Development Tasks

### Adding a New API Endpoint
1. Define route in `src/api/routes.ts`
2. Create handler in appropriate controller
3. Add service method if needed
4. Write tests for the endpoint
5. Update OpenAPI documentation

### Creating a Workflow Template
1. Define workflow in `src/workflows/templates/`
2. Implement step handlers
3. Add workflow to registry
4. Create example usage
5. Document workflow parameters

### Implementing a New Feature
1. Start with the API design
2. Implement service layer
3. Add necessary database migrations
4. Write comprehensive tests
5. Update documentation

## Environment Variables

```env
# Required
FLY_API_TOKEN=your_fly_api_token
FLY_ORG_SLUG=lightfast

# Optional
PORT=8080
NODE_ENV=development
LOG_LEVEL=info
SSH_KEY_PATH=~/.ssh/id_rsa
DATABASE_URL=sqlite://./data.db
```

## Debugging Tips

1. Use structured logging with context
2. Implement request ID tracking
3. Add timing metrics for performance debugging
4. Use Fly.io logs for production debugging

## Performance Considerations

1. Implement connection pooling for SSH
2. Cache Fly.io API responses where appropriate
3. Use streaming for large command outputs
4. Implement pagination for list endpoints

## Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] API documentation updated
- [ ] Security audit completed
- [ ] Performance testing done

## Getting Help

When stuck:
1. Check Fly.io Machines API documentation
2. Review Hono framework docs
3. Look for similar patterns in the codebase
4. Consider security and performance implications

## Code Style

- Use TypeScript strict mode
- Prefer functional programming patterns
- Keep functions small and focused
- Document complex logic with comments
- Use meaningful variable names
- **AVOID index.ts re-export pattern**: Do not create files like `src/inngest/index.ts` that just re-export everything from other files. Import directly from the source files instead. This pattern makes it harder to track dependencies and understand the codebase.

### Import Guidelines

```typescript
// ❌ BAD: Don't create index.ts files that re-export
// src/services/index.ts
export * from './user-service';
export * from './post-service';

// ❌ BAD: Don't import from index files
import { UserService, PostService } from './services';

// ✅ GOOD: Import directly from source files
import { UserService } from './services/user-service';
import { PostService } from './services/post-service';

// ✅ GOOD: Group related imports
import { createInstance, destroyInstance } from './inngest/instance-functions';
import { executeWorkflow } from './inngest/workflow-functions';
```

The only exception is when creating a public API for a library/package where you need to control the exported interface.

## Important Commands

```bash
# Development
bun dev              # Start dev server (port 3000 by default)
bun test            # Run tests
bun run build       # Build for production

# Testing the API
curl http://localhost:3000/health  # Health check
curl http://localhost:3000/api/workflows  # List workflows
curl -X POST http://localhost:3000/api/instances -H "Content-Type: application/json" -d '{"name":"test"}'

# Dependency Management
bun add <package>    # Add a production dependency (latest version)
bun add -d <package> # Add a dev dependency (latest version)
bun install          # Install all dependencies from lockfile
bun update           # Update all dependencies

# Fly.io Setup
fly auth token       # Get your API token for .env
fly apps create lightfast-worker-instances --org lightfast  # Create worker app

# Deployment
fly deploy          # Deploy to Fly.io (lightfast org)
fly logs            # View production logs
fly ssh console     # SSH into production
fly status          # Check app status
fly machines list -a lightfast-worker-instances  # List worker instances

# Database (future)
bun run db:migrate  # Run migrations
bun run db:seed     # Seed test data
```

## Dependencies

All dependencies use latest versions. Key packages:
- **hono** (v4.7+): Lightweight web framework
- **@hono/zod-validator** (v0.7+): Request validation
- **ssh2** (v1.16+): SSH client implementation
- **pino** (v9.7+): Structured logging
- **zod** (v3.25+): Schema validation
- **inngest** (v3.39+): Reliable background job processing

## Common Issues & Solutions

### Authentication Errors
- If you get "Authorization header required", check that `API_KEY` is not set in `.env`
- For production, generate an API key and include it in requests

### Fly.io Errors
- "app not found": Run `fly apps create lightfast-worker-instances --org lightfast`
- "invalid token": Get a fresh token with `fly auth token`
- Instances stop immediately: This is normal - Fly.io stops idle machines

### SSH Connection Issues
- Currently, instances only have private IPs
- Public IP allocation needs to be implemented for SSH access
- Consider using Fly.io's proxy or wireguard for connectivity

### Port Conflicts
- Default port is 3000, change in `.env` if needed
- Kill existing process: `kill -9 $(lsof -ti:3000)`

Remember: This is a tool for developers. Prioritize developer experience, clear error messages, and robust documentation.