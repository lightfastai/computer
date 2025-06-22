# Claude Code Context - simplify-architecture
Last Updated: Sun Jun 22 13:11:16 AEST 2025
Branch: jeevanpillay/simplify-architecture
Development Mode: Fly.io Deploy Mode
Worktree Path: worktrees/simplify-architecture

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
```bash
# Run tests continuously
bun test --watch

# Check all validations
bun test && bun run build && bun run lint

# Test API locally
bun dev
# Then: curl http://localhost:3000/api/...
```

## Notes
- Remember: No classes, only pure functions
- Use neverthrow Result types for errors
- Write tests first (TDD approach)
- Import with @/* path alias
