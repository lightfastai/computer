# Repo Explorer

A client-side repository explorer built with the Lightfast Computer SDK, featuring Next.js 15, Tailwind v4, shadcn/ui components, and full TypeScript support.

## Features

- **Instance Management**: Create and manage Ubuntu instances on Fly.io
- **Repository Cloning**: Clone Git repositories directly to instances
- **File Explorer**: Browse repository files with an intuitive tree interface
- **File Viewer**: View file contents in a built-in code viewer
- **Dark Mode**: Beautiful dark theme with light/dark mode toggle
- **Client-Side**: Runs entirely in the browser (no server required)
- **Type-Safe**: Full TypeScript support with t3-oss/env-core
- **Modern UI**: Tailwind v4 with shadcn/ui components and Lucide icons

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Runtime**: React 18
- **Styling**: Tailwind CSS v4 with neutral color palette
- **Components**: shadcn/ui component system
- **Icons**: Lucide React icons
- **Theme**: next-themes for dark/light mode switching
- **SDK**: @lightfastai/computer v0.4.0
- **Environment**: t3-oss/env-core for type-safe env vars
- **Build Tool**: Bun for fast development and builds
- **Deployment**: Vercel-ready configuration

## Getting Started

### Prerequisites

- Node.js >= 18.0.0 or Bun >= 1.0.0
- Fly.io API token

### Installation

1. Install dependencies:
   ```bash
   bun install
   # or
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Fly.io API token:
   ```
   NEXT_PUBLIC_FLY_API_TOKEN=your_fly_api_token_here
   ```

3. Start the development server:
   ```bash
   bun run dev
   # or
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

### Getting a Fly.io API Token

1. Install the Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/
2. Sign up/login: `fly auth signup` or `fly auth login`
3. Generate a token: `fly auth token`
4. Copy the token to your `.env.local` file

## Usage

1. **Create Instance**: Use the instance creator to spin up a new Ubuntu instance
2. **Clone Repository**: Enter a Git repository URL to clone it to your instance
3. **Explore Files**: Browse the cloned repository using the file tree
4. **View Content**: Click on files to view their contents

## Development

```bash
# Start development server with hot reload
bun run dev
# or
npm run dev

# Type checking
bun run typecheck
# or
npm run typecheck

# Linting and formatting
bun run lint
bun run format
# or
npm run lint

# Build for production
bun run build
# or
npm run build

# Start production server
bun run start
# or
npm start
```

## Deployment

### Vercel

This project is configured for easy deployment on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `VITE_FLY_API_TOKEN`: Your Fly.io API token
4. Deploy!

The `vercel.json` file is already configured with the correct build settings.

### Environment Variables

For production deployment, set these environment variables:

- `NEXT_PUBLIC_FLY_API_TOKEN`: Your Fly.io API token
- `NEXT_PUBLIC_FLY_APP_NAME`: Fly.io app name (defaults to `lightfast-worker-instances`)

## Architecture

- **Client-Side Only**: No backend server required
- **Hooks-Based**: React hooks for state management and SDK integration
- **Type-Safe**: Full TypeScript coverage with runtime validation
- **Modular Components**: Reusable UI components with shadcn/ui
- **Error Handling**: Comprehensive error handling with user feedback

## SDK Integration

This example demonstrates the client-side capabilities of the Lightfast Computer SDK:

- Creating and managing instances
- Executing commands on instances
- Repository management
- File system operations

All operations are performed directly from the browser using the SDK's client-side APIs.

## License

MIT