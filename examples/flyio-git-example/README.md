# Lightfast Computer - Fly.io Git Explorer

This is a Next.js example application demonstrating how to use the **@lightfastai/computer** SDK to create Ubuntu instances on Fly.io and perform advanced git operations with repository exploration capabilities.

## Features

🚀 **Instance Management**
- Create new Ubuntu instances on Fly.io with provider-based configuration
- Start, stop, and restart instances
- Delete instances when no longer needed
- Real-time status monitoring

🔗 **Advanced Git Integration**
- Clone GitHub repositories directly to instances
- Switch between different branches
- View commit history with hash and message details
- Explore repository file structure organized by directories
- Read README files directly in the interface
- Enhanced file filtering (JS, TS, JSON, MD, YAML, Docker, etc.)

📁 **Repository Explorer**
- Tabbed interface for Files, Commits, and README
- Organized file tree with directory structure
- Support for multiple file types and formats
- Real-time file listing and exploration
- Branch switching with automatic content refresh

🎨 **Modern UI**
- Responsive design with Tailwind CSS
- Dark mode support
- Real-time notifications with react-hot-toast
- Loading states and error handling
- Intuitive tabbed navigation

## Getting Started

### Prerequisites

- Node.js 18+
- A Fly.io account and API token
- The parent `@lightfastai/computer` package built locally

### Installation

1. **Clone and navigate to this directory:**
   ```bash
   cd examples/flyio-git-example
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Fly.io configuration:
   ```env
   FLY_API_TOKEN=your_actual_fly_api_token_here
   FLY_APP_NAME=lightfast-worker-instances
   ```

4. **Build the parent SDK package:**
   ```bash
   cd ../..
   bun run build
   cd examples/flyio-git-example
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Use

### Creating Instances

1. Click the **"Create Instance"** button
2. Wait for the instance to be provisioned on Fly.io
3. The instance will appear in the grid with a "running" status

### Managing Instances

For each instance, you can:
- **Start/Stop**: Control the instance state
- **Restart**: Reboot the instance
- **Delete**: Permanently remove the instance

### Git Repository Exploration

1. **Enter Repository URL**: Modify the default repository URL or use `https://github.com/vercel/next.js`
2. **Clone Repository**: For running instances, click **"Clone Repo"**
3. **Switch Branches**: Use the branch selector to checkout different branches
4. **Explore Content**: Use the tabbed interface to:
   - **Files Tab**: Browse the repository file structure organized by directories
   - **Commits Tab**: View recent commit history with hashes and messages
   - **README Tab**: Read repository documentation directly in the interface

### Advanced Git Operations

The application supports:
- **Branch Management**: Switch between remote branches automatically
- **File Discovery**: Advanced filtering for development files (JS, TS, JSON, YAML, Docker, etc.)
- **Repository Analysis**: Automatic README detection and content preview
- **Commit History**: View the latest 10 commits with full details

## Technical Implementation

### Provider-Based Configuration

The SDK now uses the provider pattern for better abstraction:

```typescript
import createLightfastComputer from '@lightfastai/computer';

// Initialize with provider configuration
const computer = createLightfastComputer({
  provider: 'fly',
  flyApiToken: process.env.FLY_API_TOKEN,
  appName: process.env.FLY_APP_NAME, // required for provider pattern
});
```

### Advanced Git Operations API

```typescript
// Enhanced git operations through custom API routes
const operations = {
  clone: { instanceId, operation: 'clone', repoUrl },
  branches: { instanceId, operation: 'branches' },
  checkout: { instanceId, operation: 'checkout', branch },
  commits: { instanceId, operation: 'log' },
  fileTree: { instanceId, operation: 'tree' },
  readme: { instanceId, operation: 'readme' }
};

// Example: Get repository file structure
const response = await fetch('/api/git', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ instanceId, operation: 'tree' })
});
const { fileTree } = await response.json();
```

### State Management

Enhanced React state for git operations:

```typescript
interface GitInfo {
  branches?: string[];
  commits?: { hash: string; message: string }[];
  readme?: { file: string; content: string };
}

const [fileTree, setFileTree] = useState<Record<string, Record<string, string[]>>>({});
const [gitInfo, setGitInfo] = useState<Record<string, GitInfo>>({});
const [activeTab, setActiveTab] = useState<Record<string, 'files' | 'commits' | 'readme'>>({});
```

### Error Handling

The application implements comprehensive error handling:

```typescript
// API route error handling
if (result.isErr()) {
  return NextResponse.json(formatErrorResponse(result.error), {
    status: 500,
  });
}

// Client-side error handling with user feedback
try {
  await loadGitInfo(instanceId);
  toast.success('Repository loaded successfully!');
} catch (error) {
  toast.error(`Failed to load repository: ${error.message}`);
}
```

## API Routes

### `/api/git` - Git Operations

Advanced git operations endpoint supporting:
- `clone` - Clone repository with custom directory
- `branches` - List remote branches
- `checkout` - Switch between branches
- `log` - Get commit history
- `tree` - Get organized file structure
- `readme` - Extract and read README content

### `/api/instances` - Instance Management

Standard CRUD operations for Fly.io instances with provider-based configuration.

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `FLY_API_TOKEN` | Your Fly.io API token | Yes | - |
| `FLY_APP_NAME` | Fly.io app name for instances | Yes | `lightfast-worker-instances` |
| `NODE_ENV` | Environment mode | No | `development` |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── git/
│   │   │   └── route.ts     # Advanced git operations
│   │   ├── instances/       # Instance management routes
│   │   └── commands/        # Command execution routes
│   ├── globals.css          # Tailwind styles and custom components
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Main git explorer interface
└── lib/
    └── computer.ts          # Provider-based SDK configuration
```

## Enhanced Features

### File Type Support

The file explorer supports multiple development file types:
- **JavaScript/TypeScript**: `.js`, `.ts`, `.tsx`, `.jsx`
- **Configuration**: `.json`, `.yml`, `.yaml`, `.toml`, `.env*`
- **Documentation**: `.md`, README files
- **Containers**: `Dockerfile*`, `.conf`
- **Excludes**: `node_modules`, `.git`, `dist`, `build` directories

### Repository Analysis

- **Smart README Detection**: Automatically finds and displays README files
- **Branch Awareness**: Content updates when switching branches
- **Commit Insights**: View commit history with hashes and messages
- **Directory Organization**: Files grouped by directory structure

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Dependencies

### Core
- **Next.js 14** - React framework with App Router
- **React 18** - UI library with hooks
- **TypeScript** - Type safety and development experience

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Modern icon components

### SDK & Utilities
- **@lightfastai/computer** - Fly.io instance management with provider pattern
- **react-hot-toast** - Toast notifications
- **clsx** - Conditional className utility

## Troubleshooting

### "Failed to load instances"
- Check that your `FLY_API_TOKEN` is set correctly
- Ensure `FLY_APP_NAME` matches your Fly.io app
- Verify the token has the necessary permissions

### Git operations fail
- Ensure the instance is in "running" state
- Check that the repository URL is accessible
- Large repositories may take longer to process
- Private repositories require authentication setup

### Branch switching issues
- Verify the branch exists in the remote repository
- Check git operations don't conflict with ongoing operations
- Refresh the page if state becomes inconsistent

## Contributing

This example demonstrates advanced git integration with the Lightfast Computer SDK. To contribute:

1. Fork the main repository
2. Create a feature branch
3. Make your changes
4. Test with this example app
5. Submit a pull request

## License

MIT - see the main project license for details.