# GitHub Actions Workflows

This directory contains automated workflows for the Lightfast Computer project.

## Workflows

### CI (Continuous Integration)
- **File**: `ci.yml`
- **Triggers**: Push to main, Pull requests
- **Jobs**:
  - Lint: Checks code style with Biome
  - Type Check: Validates TypeScript types
  - Test: Runs test suite on Ubuntu and macOS
  - Build: Creates production build
  - Security: Runs security audit

### Deploy
- **File**: `deploy.yml`
- **Triggers**: Push to main, Manual dispatch
- **Jobs**:
  - Test: Runs test suite
  - Deploy: Deploys to Fly.io
- **Required Secrets**:
  - `FLY_API_TOKEN`: Fly.io authentication token

### Release
- **File**: `release.yml`
- **Triggers**: Git tags matching `v*`
- **Jobs**:
  - Build: Creates platform-specific binaries
  - Release: Creates GitHub release with artifacts
  - Docker: Builds and pushes multi-arch Docker images

### CodeQL Security Analysis
- **File**: `codeql.yml`
- **Triggers**: Push to main, PRs, Weekly schedule
- **Jobs**:
  - Analyze: Runs CodeQL security analysis

### Dependency Updates
- **File**: `dependency-update.yml`
- **Triggers**: Weekly schedule, Manual dispatch
- **Jobs**:
  - Update: Creates PR with dependency updates

## Required Secrets

Configure these in repository settings:

1. **FLY_API_TOKEN**
   - Required for Fly.io deployments
   - Get from: `fly auth token`

2. **GITHUB_TOKEN**
   - Automatically provided by GitHub Actions
   - Used for releases and PR creation

## Manual Triggers

Several workflows can be triggered manually:

```bash
# Trigger deployment
gh workflow run deploy.yml

# Trigger dependency updates
gh workflow run dependency-update.yml
```

## Monitoring

Check workflow status:
- GitHub UI: Actions tab
- CLI: `gh run list`
- API: `gh api /repos/{owner}/{repo}/actions/runs`