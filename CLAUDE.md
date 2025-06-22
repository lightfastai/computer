# Claude AI Assistant Guide

This guide provides instructions for Claude AI assistants working on the Lightfast Computer project - a Fly.io instance management system with Inngest-powered background processing.

## 🚨 MANDATORY WORKTREE RULE

**YOU MUST ALWAYS** use git worktrees for ANY development work including:
- Feature requests (e.g., "add monitoring endpoint", "integrate metrics")
- Bug fixes (e.g., "fix instance restart", "resolve memory leak")
- Chores (e.g., "update dependencies", "refactor error handling")
- ANY code changes whatsoever

**NO EXCEPTIONS**: If you're modifying code, you MUST be in a worktree.

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

This system enables users to create and manage Ubuntu instances on Fly.io with GitHub integration and command execution capabilities. The focus is on providing isolated sandboxes for development and testing.

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

### Task Agent Parallelism
- **Launch multiple agents concurrently**: When searching for keywords, patterns, or exploring different parts of the codebase, use multiple Task agents in parallel
- **Example**: Searching for "error handling" patterns, configuration files, and API endpoints can all be done simultaneously with 3 parallel Task agents
- **Performance benefit**: Parallel agents dramatically reduce investigation time compared to sequential searches

### Development Approach
- **Read first**: Always use Read tool before editing files to understand context
- **Follow conventions**: Mimic existing code style and patterns in the codebase
- **Test continuously**: Run tests frequently during development
- **Verify changes**: Use build/lint commands to catch errors early

## 📋 Development Modes

### 🚀 Fly.io Deploy Mode (Default)
Use this mode when you want Claude to handle the full development lifecycle:
- **Claude Responsibilities**:
  - Creates worktree using `./scripts/setup-worktree.sh`
  - Writes tests first (TDD approach)
  - Runs `bun test --watch` continuously
  - Runs `bun run build` iteratively to fix errors
  - Runs `bun run lint` and `bun run format`
  - Commits and pushes changes automatically
  - Deploys to Fly.io for testing
- **User Responsibilities**:
  - Tests on Fly.io deployment
  - Reports bugs or issues back to Claude
- **When to Use**: Production-ready development, team collaboration

### 🔧 Local Dev Mode
Use this mode when you're already running `bun dev` locally:
- **Claude Responsibilities**:
  - Acts as code generator only
  - Makes code changes with TDD approach
  - Asks user to test locally after changes
  - Does NOT commit or push automatically
- **User Responsibilities**:
  - Runs `bun dev` before starting
  - Tests API changes locally in real-time
  - Decides when to commit and push
- **When to Use**: Rapid prototyping, debugging, exploratory development

### Setting Development Mode
At the start of your session, tell Claude which mode to use:
- "Use Fly.io Deploy Mode" (default if not specified)
- "Use Local Dev Mode - I'm running bun dev"

## 🚨 CRITICAL: Context Preservation

**YOU MUST** preserve context to survive terminal crashes and session interruptions:

### Local Context File (Always Required)
```bash
# ALWAYS set this variable at start of each session
mkdir -p tmp_context
CONTEXT_FILE="./tmp_context/claude-context-$(basename $(pwd)).md"

# Create or check existing context file
if [ -f "$CONTEXT_FILE" ]; then
  echo "📋 Resuming from existing context:"
  cat "$CONTEXT_FILE"
else
  echo "🆕 Creating new context file: $CONTEXT_FILE"
fi
```

## Key Architecture Decisions

### Technology Stack
- **Hono**: Lightweight web framework with excellent TypeScript support
- **Bun**: Fast runtime with built-in TypeScript support and testing
- **Fly.io Machines API**: For on-demand Ubuntu compute instances
- **Vercel AI SDK**: For command streaming and AI integration

### Project Structure
```
/
├── src/
│   ├── api/           # API routes and handlers (instances, monitoring, commands)
│   ├── services/      # Business logic (fly-service, instance-service, command-service)
│   ├── lib/           # Shared utilities (config, error-handler)
│   ├── schemas/       # Zod validation schemas
│   └── index.ts       # Entry point with Hono app
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

### Error Handling with neverthrow
```typescript
// Use Result types for all operations
import { Result, ok, err } from 'neverthrow';
import { AppError, NotFoundError, ValidationError } from '@/lib/error-handler';

// Service functions return Result types
export const getInstance = async (
  id: string
): Promise<Result<Instance, AppError>> => {
  const instance = instances.get(id);
  if (!instance) {
    return err(new NotFoundError('Instance', id));
  }
  return ok(instance);
};

// Handle in API routes
const result = await getInstance(id);
return result.match(
  (instance) => c.json(instance),
  (error) => c.json({ error: error.userMessage }, error.statusCode)
);
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

### 3. Command Execution (`src/services/command-service.ts`)
- Execute commands on instances via Fly.io exec
- Stream output in real-time using SSE
- Command history tracking
- Security whitelist for allowed commands

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

### Package Management

**IMPORTANT**: Always use `bun add <package>` to install dependencies. Never manually edit package.json.

```bash
# ✅ CORRECT: Use bun add
bun add zod
bun add -d @types/node

# ❌ WRONG: Never edit package.json directly
```

### Using Parallel Task Agents

**When to launch multiple Task agents concurrently:**
1. **Codebase exploration**: "Find all error handling patterns" + "Find all API endpoints" + "Find configuration files"
2. **Feature investigation**: "Find authentication logic" + "Find user management" + "Find permission checks"
3. **Refactoring preparation**: "Find all usages of X" + "Find similar patterns" + "Find test coverage"
4. **Debugging**: "Find error logs" + "Find related functions" + "Find recent changes"

**Example usage:**
```typescript
// Launch 3 parallel agents to investigate authentication
Task 1: "Find all authentication-related files and logic"
Task 2: "Find all API endpoints that require authentication"
Task 3: "Find all tests related to authentication"
```

### Adding a New API Endpoint
1. **Write tests first** in `tests/api/`
2. Define route in `src/api/routes.ts`
3. Create handler function in appropriate API file
4. Add service function if needed in `src/services/`
5. Run `bun test` and `bun run build` to verify

### Adding Instance Functionality
1. **Write tests first** in `tests/services/instance-service.test.ts`
2. Add function to `src/services/instance-service.ts`
3. Update API routes to expose functionality
4. Run tests continuously with `bun test --watch`

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

# Optional
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

## Debugging Tips

1. Use structured logging with Pino (`src/lib/error-handler.ts`)
2. Check Fly.io machine states with `fly machines list`
3. Use `bun run build` to catch TypeScript errors
4. Monitor command execution logs

## Performance Considerations

1. In-memory state storage with Map (no database)
2. Fly.io API calls are cached at service level
3. Instances auto-sleep when idle (Fly.io feature)
4. Command execution is rate-limited by instance capacity

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

## Worktree Development Workflow

### Step 1: Resume or Start Work

**ALWAYS** check for existing work first:
```bash
# Check existing worktrees
git worktree list

# Check for existing context files
ls -la ./tmp_context/claude-context-*.md 2>/dev/null || echo "No context files found"

# If worktree exists, navigate to it
cd worktrees/<feature_name>

# Load existing context
mkdir -p tmp_context
CONTEXT_FILE="./tmp_context/claude-context-$(basename $(pwd)).md"
cat "$CONTEXT_FILE" 2>/dev/null || echo "No existing context found"
```

### Step 2: Create Worktree for New Features

**MANDATORY**: You MUST create a worktree for ANY code changes:
```bash
# Automated setup (RECOMMENDED)
./scripts/setup-worktree.sh <feature_name>
cd worktrees/<feature_name>

# The script will:
# - Create branch: jeevanpillay/<feature_name>
# - Install dependencies with bun
# - Copy .env.local if exists
# - Set up context file
# - Run initial checks
```

### Step 3: Development with TDD

1. **Write tests first** following TDD workflow above
2. **Run tests continuously**: `bun test --watch`
3. **Implement code** to make tests pass
4. **Validate frequently**:
   ```bash
   bun run build      # TypeScript compilation
   bun run lint       # Code style
   bun run format     # Auto-format
   bun run typecheck  # Type validation
   ```

### Step 4: Commit and Deploy

#### Fly.io Deploy Mode:
```bash
# Ensure all checks pass
bun test && bun run build && bun run lint

# Commit with conventional format
git add .
git commit -m "feat: <description>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push branch
git push -u origin jeevanpillay/<feature_name>

# Deploy to Fly.io
fly deploy

# Monitor deployment
fly logs
fly status
```

#### Local Dev Mode:
```bash
# Make changes and notify user
echo "✅ Changes complete. Please test locally at http://localhost:3000"
echo "📝 Test these endpoints:"
echo "   - GET /api/instances"
echo "   - POST /api/instances"
# User handles commit/deploy when ready
```

### Step 5: Cleanup After Merge

```bash
# Remove worktree BEFORE merging to prevent errors
cd ../..
git worktree remove worktrees/<feature_name>

# Sync main branch after merge
git checkout main
git pull origin main
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
- **ai**: Vercel AI SDK for streaming and AI integration
- **@ai-sdk/openai**: OpenAI provider for AI SDK

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

## Key Workflow Reminders

1. **WORKTREES ARE MANDATORY** - ANY code change requires a worktree
2. **TDD IS MANDATORY** - Write tests first with `bun test --watch`
3. **NO CLASSES** - Pure functions and module-level state only
4. **USE RESULT TYPES** - neverthrow for ALL error handling
5. **RUN BUILD OFTEN** - `bun run build` catches TypeScript errors
6. **DIRECT IMPORTS** - Always use `@/*` path alias
7. **FUNCTIONAL STYLE** - Small, focused, pure functions
8. **CONTEXT PRESERVATION** - Use local context files for session continuity
