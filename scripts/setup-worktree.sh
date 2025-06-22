#!/usr/bin/env bash

# Lightfast Computer - Worktree Setup Script
# Creates a new git worktree for feature development following Claude Code workflow

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_PREFIX="jeevanpillay"
WORKTREES_DIR="worktrees"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] <feature-name>

Creates a new git worktree for feature development.

Arguments:
  feature-name    Name of the feature (will be prefixed with username)

Options:
  -h, --help      Show this help message
  -p, --prefix    Branch prefix (default: $DEFAULT_PREFIX)
  -f, --force     Force creation even if worktree exists

Examples:
  $0 add-metrics-endpoint
  $0 -p myusername fix-instance-restart
  $0 --force update-error-handling

This will create:
  - Worktree at: $WORKTREES_DIR/<feature-name>
  - Branch named: <prefix>/<feature-name>
  - Context file for Claude Code session tracking
EOF
}

# Parse arguments
PREFIX="$DEFAULT_PREFIX"
FORCE=false
FEATURE_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -p|--prefix)
            PREFIX="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        *)
            FEATURE_NAME="$1"
            shift
            ;;
    esac
done

# Validate feature name
if [ -z "$FEATURE_NAME" ]; then
    print_color "$RED" "Error: Feature name is required"
    usage
    exit 1
fi

# Ensure we're in the root of the git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_color "$RED" "Error: Not in a git repository"
    exit 1
fi

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Set variables
BRANCH_NAME="$PREFIX/$FEATURE_NAME"
WORKTREE_PATH="$WORKTREES_DIR/$FEATURE_NAME"

print_color "$BLUE" "🚀 Setting up worktree for: $FEATURE_NAME"
echo "   Branch: $BRANCH_NAME"
echo "   Path: $WORKTREE_PATH"
echo ""

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ] && [ "$FORCE" = false ]; then
    print_color "$YELLOW" "Worktree already exists at $WORKTREE_PATH"
    echo "Use -f/--force to recreate, or cd into existing worktree:"
    echo "  cd $WORKTREE_PATH"
    exit 1
fi

# Update main branch
print_color "$BLUE" "📥 Updating main branch..."
git checkout main
git pull origin main

# Create worktrees directory if it doesn't exist
mkdir -p "$WORKTREES_DIR"

# Remove existing worktree if force flag is set
if [ -d "$WORKTREE_PATH" ] && [ "$FORCE" = true ]; then
    print_color "$YELLOW" "⚠️  Removing existing worktree..."
    git worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true
fi

# Create new worktree
print_color "$BLUE" "🌳 Creating worktree..."
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"

# Change to worktree directory
cd "$WORKTREE_PATH"

# Install dependencies
print_color "$BLUE" "📦 Installing dependencies..."
bun install

# Copy environment file if it exists
if [ -f "../../.env.local" ]; then
    print_color "$BLUE" "🔐 Copying environment variables..."
    cp "../../.env.local" .env.local
else
    print_color "$YELLOW" "⚠️  No .env.local found, creating empty file"
    touch .env.local
fi

# Create context directory and file for Claude Code
print_color "$BLUE" "📝 Setting up Claude Code context..."
mkdir -p tmp_context
CONTEXT_FILE="./tmp_context/claude-context-$FEATURE_NAME.md"

cat > "$CONTEXT_FILE" << EOF
# Claude Code Context - $FEATURE_NAME
Last Updated: $(date)
Branch: $BRANCH_NAME
Development Mode: Fly.io Deploy Mode
Worktree Path: $WORKTREE_PATH

## Task Description
[Describe the feature/task here]

## Test Status
- [ ] Unit tests written
- [ ] Tests passing
- [ ] Build passing (bun run build)
- [ ] Lint passing (bun run lint)
- [ ] API manually tested

## Implementation Progress
- [ ] Schema defined (if needed)
- [ ] Service functions implemented
- [ ] API routes added (if needed)
- [ ] Inngest functions created (if needed)
- [ ] Error handling with Result types
- [ ] Documentation updated

## Testing Commands
\`\`\`bash
# Run tests continuously
bun test --watch

# Check all validations
bun test && bun run build && bun run lint

# Test API locally
bun dev
# Then: curl http://localhost:3000/api/...
\`\`\`

## Notes
- Remember: No classes, only pure functions
- Use neverthrow Result types for errors
- Write tests first (TDD approach)
- Import with @/* path alias
EOF

# Run initial checks
print_color "$BLUE" "🧪 Running initial checks..."
echo ""

# Check TypeScript compilation
if bun run build > /dev/null 2>&1; then
    print_color "$GREEN" "✅ TypeScript compilation: OK"
else
    print_color "$YELLOW" "⚠️  TypeScript compilation: Has errors (this is normal for new features)"
fi

# Check linting
if bun run lint > /dev/null 2>&1; then
    print_color "$GREEN" "✅ Linting: OK"
else
    print_color "$YELLOW" "⚠️  Linting: Has issues"
fi

# Check tests
if bun test > /dev/null 2>&1; then
    print_color "$GREEN" "✅ Tests: Passing"
else
    print_color "$YELLOW" "⚠️  Tests: Some failing (this is normal)"
fi

echo ""
print_color "$GREEN" "✨ Worktree setup complete!"
echo ""
print_color "$BLUE" "Next steps:"
echo "  1. cd $WORKTREE_PATH"
echo "  2. Start test watcher: bun test --watch"
echo "  3. Begin development with TDD approach"
echo "  4. Check context: cat $CONTEXT_FILE"
echo ""
print_color "$YELLOW" "Remember to:"
echo "  - Write tests first (TDD)"
echo "  - Use pure functions (no classes)"
echo "  - Use Result types for error handling"
echo "  - Run 'bun run build' frequently"
echo "  - Commit when tests pass"
echo ""
print_color "$BLUE" "Happy coding! 🚀"