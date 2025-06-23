# Claude AI Assistant Guide

This guide provides instructions for Claude AI assistants working on the Lightfast Computer project - a pure TypeScript SDK for Fly.io instance management.

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

# Build and test commands
bun run build         # Check for TypeScript compilation errors
bun run lint          # Check code style with Biome
```

## Project Context

This SDK enables developers to create and manage Ubuntu instances on Fly.io with GitHub integration and command execution capabilities. The focus is on providing a clean TypeScript interface for isolated compute environments.

### Fly.io Deployment Details
- **App**: `lightfast-worker-instances` (where Ubuntu instances run)
- **Organization**: `lightfast`
- **Primary Region**: `iad` (US East)
- **Configuration**: See `fly.toml` for deployment configuration

### Important Implementation Notes
- The Fly.io app name is hardcoded in `fly-service.ts` as `lightfast-worker-instances`
- Instances are created without public IPs (only private IPv6 addresses)
- No SSH functionality - instances are managed through Fly.io Machines API only
- Pure SDK - no HTTP server or API endpoints

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

## 📋 Development Mode

### 🔧 SDK Development Mode
Claude follows a pure SDK development approach:
- **Claude Responsibilities**:
  - Creates worktree using `./scripts/setup-worktree.sh`
  - Writes tests first (TDD approach)
  - Runs `bun test --watch` continuously
  - Runs `bun run build` iteratively to fix errors
  - Runs `bun run lint` and `bun run format`
  - Commits and pushes changes automatically
- **User Responsibilities**:
  - Tests SDK integration in their own projects
  - Reports bugs or issues back to Claude
- **When to Use**: All SDK development (this is the only mode)

## 🔄 PR-Based Development Workflow

**Claude MUST follow this workflow for ALL development:**

### 1. Feature Development
```mermaid
Start → Create Worktree → Write Tests → Implement → Create PR → Wait for Review
```

### 2. After PR Merge
```mermaid
PR Merged → Analyze Changes → Suggest Version Bump? → User Decides → Publish
```

### PR Creation Checklist
Claude should ensure before creating a PR:
- ✅ All tests pass (`bun test`)
- ✅ TypeScript builds (`bun run build`)
- ✅ Linting passes (`bun run lint`)
- ✅ If npm package: `bun run prepublishOnly` succeeds
- ✅ Commit messages follow conventional format
- ✅ PR description includes summary and test plan
- ✅ Monitor CI after PR creation and fix any failures iteratively
- ✅ Update PR description with any known issues or workarounds

### Version Bump Decision Tree
After PR merge, Claude analyzes:
```
├── Contains "feat:" commits? → Suggest MINOR version
├── Contains "fix:" commits? → Suggest PATCH version
├── Contains "BREAKING CHANGE"? → Suggest MAJOR version
└── Only chore/docs/test? → No version bump needed
```

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
- **TypeScript**: Strict type safety and excellent developer experience
- **Bun**: Fast runtime with built-in TypeScript support and testing
- **Fly.io Machines API**: For on-demand Ubuntu compute instances
- **neverthrow**: Functional error handling with Result types
- **Zod**: Runtime validation and schema parsing
- **Pino**: Structured logging

### Project Structure
```
/
├── src/
│   ├── services/      # Business logic (fly-service, instance-service, command-service)
│   ├── lib/           # Shared utilities (config, error-handler)
│   ├── schemas/       # Zod validation schemas
│   ├── types/         # TypeScript type definitions
│   └── sdk.ts         # Main SDK export
├── tests/             # Test files (using bun:test)
└── config files       # biome.json, tsconfig.json
```

## Development Patterns

### SDK Design
- Clean TypeScript interface for instance management
- Result types for safe error handling
- Request validation using Zod schemas
- Comprehensive type definitions
- Functional programming patterns

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

// Handle in SDK client code
const result = await computer.instances.get(id);
result.match(
  (instance) => console.log('Instance:', instance),
  (error) => console.error('Error:', error.userMessage)
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
- Stateless operations - no local storage
- Direct Fly.io API integration
- Real-time status from Fly.io API
- Health checking via Fly.io machine status

### 2. Fly.io Integration (`src/services/fly-service.ts`)
- Use Machines API v2 for Ubuntu instances
- Implement proper error handling for API failures
- Machine size parsing and configuration
- Region selection (defaults to `iad`)

### 3. Command Execution (`src/services/command-service.ts`)
- Execute commands on instances via Fly.io exec
- Stream output in real-time using SSE
- Security whitelist for allowed commands
- No command history (stateless operation)

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

1. **Input Validation**: All inputs validated with Zod schemas
2. **API Token Security**: Pass Fly.io tokens via SDK initialization, not environment variables
3. **Instance Isolation**: Fly.io provides natural isolation between machines
4. **API Token Security**: Fly.io tokens should be treated as sensitive credentials

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
3. Update SDK interface if needed
4. Write comprehensive tests for all scenarios
5. Ensure `bun run build` passes without errors

## SDK Configuration

The SDK requires a Fly.io API token to be passed during initialization:

```typescript
import { createLightfastComputer } from '@lightfastai/computer';

const computer = createLightfastComputer({
  flyApiToken: 'your_fly_api_token'
});
```

For local development, you can optionally store the token in a `.env` file to avoid hardcoding it in your test files.

## Debugging Tips

1. Use structured logging with Pino (`src/lib/error-handler.ts`)
2. Check Fly.io machine states with `fly machines list`
3. Use `bun run build` to catch TypeScript errors
4. Monitor command execution logs

## Performance Considerations

1. Stateless architecture - no local storage
2. Direct Fly.io API calls for all operations
3. Instances auto-sleep when idle (Fly.io feature)
4. Command execution is rate-limited by instance capacity

## Testing

```bash
# Run tests
bun test
bun test --watch

# Build and validate
bun run build
bun run lint
bun run typecheck

# List instances (for debugging)
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
# - Create branch: jeevanpillay/<feature_name>  ⚠️ NOTE: Always username/feature, never feat/feature
# - Install dependencies with bun
# - Set up project structure
# - Set up context file
# - Run initial checks
```

**⚠️ IMPORTANT**: Branch names MUST follow the pattern `jeevanpillay/<feature-name>`, NOT `feat/<feature-name>`. This ensures proper attribution and follows GitHub best practices for user branches.

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

### Step 4: Commit and Create PR

#### Fly.io Deploy Mode:
```bash
# Ensure all checks pass
bun test && bun run build && bun run lint

# Check for npm package build (if applicable)
if [ -f "package.json" ] && grep -q '"prepublishOnly"' package.json; then
  echo "📦 Testing npm package build..."
  bun run prepublishOnly
fi

# Commit with conventional format
git add .
git commit -m "feat: <description>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push branch
git push -u origin jeevanpillay/<feature_name>

# Create PR using GitHub CLI
gh pr create --title "feat: <description>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points describing the changes>

## Changes
- <specific change 1>
- <specific change 2>

## Test Plan
- [ ] All tests pass (`bun test`)
- [ ] TypeScript builds cleanly (`bun run build`)
- [ ] Linting passes (`bun run lint`)
- [ ] Tested locally/on Fly.io

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"

# Show PR URL
echo "📝 Pull Request created! Review at the URL above."
```

### Step 4a: Iterative CI Testing and Fixing

**IMPORTANT**: After creating a PR, Claude should continuously monitor and fix CI failures:

1. **Start by creating a TODO** to track the CI fixing task:
   ```
   TodoWrite: "Iteratively fix CI issues until all checks pass" (in_progress, high priority)
   ```

2. **Monitor and fix CI failures**:
```bash
# Monitor CI status
gh pr checks <PR_NUMBER> --watch

# If failures occur, follow this iterative approach:
while true; do
  # 1. Check CI status
  gh pr checks <PR_NUMBER>

  # 2. If failures exist, investigate specific errors
  gh run view <RUN_ID> --log-failed | head -100

  # 3. Common CI fixes:
  # - Environment variables: Add to .github/workflows/ci.yml
  # - Lint errors: Run `bun run lint:fix`
  # - Type errors: Run `bun run build` locally
  # - Test failures: Check for test isolation issues
  # - Missing dependencies: Ensure setup steps in CI

  # 4. Apply fixes and commit
  git add -A
  git commit -m "fix: <specific fix description>

<details of what was fixed>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

  # 5. Push and continue monitoring
  git push

  # 6. Wait for new CI run
  sleep 30

  # 7. Check if all passes
  if gh pr checks <PR_NUMBER> | grep -v "fail"; then
    echo "✅ All CI checks passing!"
    break
  fi
done
```

**Common CI Issues and Solutions**:

1. **Mock Configuration Missing**
   ```typescript
   // Ensure tests mock the Fly.io API properly
   const mockFlyService = spyOn(flyService, 'createMachine');
   mockFlyService.mockResolvedValue({ id: 'test-123' });
   ```

2. **Type-Safe Mocking**
   ```typescript
   // Use proper typing with bun:test mocks
   import { type Mock, mock } from 'bun:test';
   const mockFetch = mock() as Mock<typeof fetch>;
   
   // Or use spyOn for existing functions
   const mockCreateInstance = spyOn(instanceService, 'createInstance');
   ```

3. **Test Isolation Issues**
   - Add proper beforeEach/afterEach cleanup
   - Restore global mocks after tests
   - Use fresh storage instances per test

4. **Security Scan Failures**
   - Ensure bun is installed in security job
   - Add `|| echo "No vulnerabilities"` for empty audits

5. **Import Order Issues**
   ```bash
   bun run lint:fix  # Auto-fixes import ordering
   ```

6. **Test Isolation Issues (Complex)**
   If tests pass individually but fail when run together:
   ```typescript
   // Save and restore global state
   const originalFetch = global.fetch;
   afterEach(() => {
     global.fetch = originalFetch;
   });

   // Or temporarily allow failures in CI
   run: bun test || echo "Tests completed with known isolation issues"
   ```
   **Note**: Create a TODO to fix test isolation properly in a future PR

#### SDK Development Mode:
```bash
# Make changes and notify user
echo "✅ Changes complete. Please test the SDK integration:"
echo "📝 Test these features:"
echo "   - computer.instances.create()"
echo "   - computer.instances.list()"
echo "   - computer.commands.execute()"
# User handles testing in their own projects
```

### Step 5: After PR Merge - Version Bump Decision

**🚨 CLAUDE MUST CHECK**: After a PR is merged, evaluate if a version bump is needed:

```bash
# After PR is merged, Claude should analyze and suggest:
echo "🤔 Analyzing changes for version bump recommendation..."

# Check what changed
git log --oneline main..HEAD
git diff main...HEAD --stat

# Claude should suggest based on conventional commits:
# - feat: → minor version (0.1.0 → 0.2.0)
# - fix: → patch version (0.1.0 → 0.1.1)
# - BREAKING CHANGE: → major version (0.1.0 → 1.0.0)
# - chore/docs/style/refactor/test: → no version bump needed

# If version bump is recommended:
echo "📦 Version Bump Recommended!"
echo "Based on the changes, I recommend a [patch/minor/major] version bump."
echo ""
echo "Current version: $(grep '"version"' package.json | cut -d'"' -f4)"
echo "Suggested new version: X.X.X"
echo ""
echo "To release, run:"
echo "  1. git checkout main && git pull"
echo "  2. npm version [patch/minor/major]"
echo "  3. git push --follow-tags"
echo ""
echo "This will trigger the GitHub Action to publish to npm."
```

### Step 6: npm Publishing Workflow

When user agrees to version bump:

```bash
# 1. Ensure on main with latest changes
git checkout main
git pull origin main

# 2. Run version command (this creates commit + tag)
npm version patch  # or minor/major based on changes

# 3. Publish to npm
npm publish --access public

# 4. Update CHANGELOG.md with the new version
# Add new section at the top with:
# - Version number and date
# - Changes categorized as Added/Changed/Fixed/Removed
# - Update version comparison links at bottom

# 5. Commit changelog update
git add CHANGELOG.md
git commit -m "docs: update changelog for vX.X.X release

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 6. Push changes
git push origin main
```

### Step 7: Cleanup After Merge

```bash
# Remove worktree BEFORE merging to prevent errors
cd ../..
git worktree remove worktrees/<feature_name>

# Sync main branch after merge
git checkout main
git pull origin main
```

## 📦 npm Package Management & Versioning

### Semantic Versioning Guidelines

Claude should understand and follow semantic versioning (semver):
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backward compatible)
- **PATCH** (0.0.1): Bug fixes (backward compatible)

### When Claude Should Suggest Version Bumps

**ALWAYS suggest a version bump when PRs contain:**

1. **Patch Version (bug fixes):**
   - `fix:` commits
   - Bug fixes that don't break API
   - Security patches
   - Performance improvements
   - Documentation fixes (if packaged)

2. **Minor Version (new features):**
   - `feat:` commits
   - New API endpoints
   - New SDK methods
   - New configuration options
   - New dependencies (that don't break existing usage)

3. **Major Version (breaking changes):**
   - Any commit with `BREAKING CHANGE:` in the body
   - Removed API endpoints or methods
   - Changed function signatures
   - Changed return types
   - Renamed exports
   - Dropped Node.js version support

**NO version bump needed for:**
- `chore:` commits (unless they affect the published package)
- `docs:` commits (unless docs are part of the package)
- `style:` commits
- `refactor:` commits (unless they change the API)
- `test:` commits
- CI/CD changes

### Version Bump Workflow for Claude

```bash
# 1. After PR merge, check recent commits
git log --oneline $(git describe --tags --abbrev=0)..HEAD

# 2. Analyze commit types
PATCH_COMMITS=$(git log --oneline $(git describe --tags --abbrev=0)..HEAD | grep -c "^[a-f0-9]* fix:")
MINOR_COMMITS=$(git log --oneline $(git describe --tags --abbrev=0)..HEAD | grep -c "^[a-f0-9]* feat:")
BREAKING_CHANGES=$(git log $(git describe --tags --abbrev=0)..HEAD | grep -c "BREAKING CHANGE")

# 3. Determine version bump
if [ $BREAKING_CHANGES -gt 0 ]; then
  echo "💥 MAJOR version bump needed (breaking changes detected)"
elif [ $MINOR_COMMITS -gt 0 ]; then
  echo "✨ MINOR version bump needed (new features added)"
elif [ $PATCH_COMMITS -gt 0 ]; then
  echo "🐛 PATCH version bump needed (bug fixes)"
else
  echo "📝 No version bump needed (only maintenance changes)"
fi
```

### npm Publishing Checklist

Before suggesting a version bump, Claude should verify:

```bash
# Pre-publish checks
echo "📋 Pre-publish Checklist:"
echo "[ ] All tests pass: bun test"
echo "[ ] Build succeeds: bun run build"
echo "[ ] Lint passes: bun run lint"
echo "[ ] Package builds: bun run prepublishOnly"
echo "[ ] CHANGELOG updated (if exists)"
echo "[ ] README is up to date"
echo "[ ] Breaking changes documented"
```

### Package.json Scripts for Publishing

Ensure these scripts exist in package.json:
```json
{
  "scripts": {
    "prepublishOnly": "npm run build && npm run test && npm run lint",
    "release": "npm version patch && git push --follow-tags",
    "release:minor": "npm version minor && git push --follow-tags",
    "release:major": "npm version major && git push --follow-tags"
  }
}
```

## Essential Commands for Claude

```bash
# Development Workflow
bun test --watch        # Run tests continuously (primary command)
bun test               # Run all tests once
bun run build          # Check TypeScript compilation (run frequently)
bun run lint           # Check code style with Biome
bun run typecheck      # Verify TypeScript types

# Dependencies
bun add <package>      # Add production dependency
bun add -d <package>   # Add dev dependency
bun install            # Install from lockfile

# SDK Testing (in user projects)
npm install @lightfast/computer
# Test SDK integration in user's code

# Debugging
fly machines list -a lightfast-worker-instances  # List instances
```

## Key Dependencies

- **neverthrow**: Functional error handling with Result types
- **pino**: Structured logging
- **zod**: Schema validation and TypeScript type inference
- **TypeScript**: Strict mode with comprehensive type coverage

## CI/CD Cost Optimization

### macOS Runners
**IMPORTANT**: macOS runners on GitHub Actions cost 10x more than Linux runners.
- Only run macOS tests on the main branch after PR merge
- PRs should only use ubuntu-latest runners
- Use matrix strategy with conditional OS selection:
  ```yaml
  matrix:
    os: ${{ github.ref == 'refs/heads/main' && fromJSON('["ubuntu-latest", "macos-latest"]') || fromJSON('["ubuntu-latest"]') }}
  ```

## Common Issues & Solutions

### Fly.io Errors
- "app not found": Run `fly apps create lightfast-worker-instances --org lightfast`
- "invalid token": Get fresh token with `fly auth token`
- Instances stop when idle: This is normal Fly.io behavior
- **Token validation errors**: The Fly.io Machines API v2 requires specific token formats. Use org or deploy tokens generated with `fly tokens create org -o lightfast`. Personal tokens from `fly auth token` may not work with the Machines API.

### Development Issues
- **TypeScript errors**: Run `bun run build` frequently to catch compilation issues
- **Test failures**: Fix immediately, don't proceed with failing tests
- **SDK initialization**: Ensure flyApiToken is passed to createLightfastComputer()

### SDK Issues
- **Import errors**: Ensure proper TypeScript paths and exports
- **Validation errors**: All inputs validated with Zod schemas in `src/schemas/`
- **Result types**: Always handle both success and error cases with neverthrow

## Key Workflow Reminders

1. **WORKTREES ARE MANDATORY** - ANY code change requires a worktree
2. **TDD IS MANDATORY** - Write tests first with `bun test --watch`
3. **NO CLASSES** - Pure functions and module-level state only
4. **USE RESULT TYPES** - neverthrow for ALL error handling
5. **RUN BUILD OFTEN** - `bun run build` catches TypeScript errors
6. **DIRECT IMPORTS** - Always use `@/*` path alias
7. **FUNCTIONAL STYLE** - Small, focused, pure functions
8. **CONTEXT PRESERVATION** - Use local context files for session continuity
9. **CREATE PRS** - Always create PRs with `gh pr create`, never merge directly
10. **SUGGEST VERSIONS** - After PR merge, analyze commits and suggest version bumps
11. **CHECK PUBLISHING** - Run `prepublishOnly` before creating PRs for npm packages
12. **CONVENTIONAL COMMITS** - Use feat/fix/chore prefixes for automatic versioning
13. **UPDATE CHANGELOG** - Always update CHANGELOG.md after publishing new versions with proper categorization and version links
