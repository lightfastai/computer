# Lightfast Computer SDK Examples

This directory contains example applications demonstrating the Lightfast Computer SDK with the new provider abstraction pattern.

## Examples Overview

### 1. Fly.io Git Example (`flyio-git-example/`)
A complete Next.js application demonstrating:
- Fly.io provider configuration
- Git repository cloning and exploration
- Multi-branch support
- File tree navigation
- Real-time command execution
- Modern UI with tabbed interface

**Getting Started:**
```bash
cd flyio-git-example
npm install
cp .env.example .env.local
# Add your FLY_API_TOKEN to .env.local
npm run dev
```

### 2. Vercel Next.js App (`vercel-nextjs-app/`)
A modern Next.js application showcasing:
- Vercel Sandbox provider integration
- Interactive terminal with command execution
- File explorer for sandbox browsing
- Git repository cloning during creation
- Responsive UI with shadcn/ui components

**Getting Started:**
```bash
cd vercel-nextjs-app
chmod +x setup-demo.sh
./setup-demo.sh
# Add your VERCEL_TOKEN to .env.local
bun run dev
```

## Provider Configuration

The SDK uses a provider abstraction pattern with discriminated union types for type-safe configuration:

### Fly.io Provider
```typescript
import { createLightfastComputer } from '@lightfastai/computer';

const computer = createLightfastComputer({
  provider: 'fly',
  flyApiToken: process.env.FLY_API_TOKEN!,
  appName: process.env.FLY_APP_NAME || 'lightfast-worker-instances'
});
```

### Vercel Provider
```typescript
const computer = createLightfastComputer({
  provider: 'vercel',
  vercelToken: process.env.VERCEL_TOKEN!,
  projectId: process.env.VERCEL_PROJECT_ID, // optional
  teamId: process.env.VERCEL_TEAM_ID // optional
});
```

## Key Features Demonstrated

Both examples showcase:
- ✅ Provider abstraction pattern with type safety
- ✅ Git repository cloning and exploration
- ✅ File listing and navigation
- ✅ Real-time command execution
- ✅ Error handling with Result types
- ✅ Modern, responsive UI design

## Environment Variables

### Fly.io Example
- `FLY_API_TOKEN` - Your Fly.io API token
- `FLY_APP_NAME` - Your Fly.io app name (default: lightfast-worker-instances)

### Vercel Example
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_PROJECT_ID` - (Optional) Your Vercel project ID
- `VERCEL_TEAM_ID` - (Optional) Your Vercel team ID

## Documentation

For more detailed information:
- [SDK Usage Guide](../SDK_USAGE.md)
- [Vercel Sandbox Guide](../VERCEL_SANDBOX_GUIDE.md)
- [Main Repository](https://github.com/lightfastai/computer)