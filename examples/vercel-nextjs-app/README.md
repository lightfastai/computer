# Vercel Sandbox Demo - Next.js Application

A comprehensive demonstration of the Lightfast Computer SDK's Vercel Sandbox provider integration. This Next.js application showcases how to create, manage, and interact with ephemeral compute environments using Vercel Sandbox.

## Features

### 🚀 Sandbox Management
- **Create Sandboxes**: Create new Vercel Sandbox instances with optional Git repository cloning
- **Lifecycle Control**: Start, stop, restart, and destroy sandbox instances
- **Real-time Status**: Monitor sandbox states with automatic refresh
- **Git Integration**: Clone repositories directly into sandboxes during creation

### 💻 Interactive Terminal
- **Command Execution**: Execute commands directly in sandbox environments
- **Real-time Output**: See command results with proper exit codes and error handling
- **Command History**: Navigate through previous commands with arrow keys
- **Quick Commands**: Pre-defined common commands for quick access
- **Syntax Highlighting**: Terminal-style output with color coding

### 📁 File Explorer
- **Directory Navigation**: Browse files and folders in sandbox environments
- **File Viewing**: View file contents with syntax highlighting detection
- **Breadcrumb Navigation**: Easy navigation through directory structures
- **File Type Icons**: Visual indicators for different file types
- **File Metadata**: View file sizes, permissions, and modification dates

### 🎨 Modern UI
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Mode Ready**: Built with shadcn/ui components supporting dark mode
- **Loading States**: Proper loading indicators for all operations
- **Error Handling**: Comprehensive error messages and recovery options
- **Tab Interface**: Organize different views with clean tab navigation

## Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- A Vercel account with API access
- Vercel API token (required)

### Quick Setup

Use the automated setup script:

```bash
cd examples/vercel-nextjs-app
chmod +x setup-demo.sh
./setup-demo.sh
```

This script will:
- Create `.env.local` from the example
- Install dependencies
- Build the project to verify setup
- Provide next steps

### Manual Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/lightfastai/computer.git
   cd computer/examples/vercel-nextjs-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

4. **Configure your Vercel credentials** in `.env.local`:
   ```env
   VERCEL_TOKEN=your_vercel_token_here
   VERCEL_PROJECT_ID=your_project_id_here  # Optional
   VERCEL_TEAM_ID=your_team_id_here        # Optional
   ```

### Getting Your Vercel Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Give it a name (e.g., "Lightfast Computer SDK")
4. Select appropriate scopes (recommended: full access for development)
5. Copy the generated token to your `.env.local` file

### Running the Application

1. **Start the development server**:
   ```bash
   npm run dev
   # or
   bun dev
   ```

2. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

3. **Start creating sandboxes** and exploring the features!

## Usage Guide

### Creating a Sandbox

1. **Fill out the form** in the "Overview" tab:
   - **Sandbox Name**: A unique name for your sandbox
   - **Git Repository URL** (optional): URL to a Git repository to clone

2. **Click "Create Sandbox"** and wait for it to be provisioned

3. **Monitor the status** in the sandbox list - it will show as "creating" then "started"

### Using the Terminal

1. **Select a running sandbox** from the list
2. **Click "Terminal"** or switch to the Terminal tab
3. **Execute commands** using the input field at the bottom
4. **Use quick commands** for common operations like `ls -la`, `git status`, etc.
5. **Navigate command history** with up/down arrow keys

### Browsing Files

1. **Select a running sandbox** from the list
2. **Click "Files"** or switch to the Files tab
3. **Navigate directories** by clicking on folder names
4. **View file contents** by clicking on file names
5. **Use breadcrumb navigation** to move between directories

### Common Use Cases

#### 1. Exploring a Git Repository
```bash
# Create sandbox with repository URL
# Then use terminal commands:
git log --oneline -10
git status
ls -la
cat README.md
```

#### 2. Running a Node.js Project
```bash
# After cloning a Node.js repository:
npm install
npm start
# Check if the application is running on the exposed port
```

#### 3. Python Development
```bash
# Check Python version
python3 --version
# Install dependencies
pip install -r requirements.txt
# Run Python scripts
python3 app.py
```

#### 4. General File Operations
```bash
# List files with details
ls -la
# Check current directory
pwd
# View file contents
cat package.json
# Search for files
find . -name "*.js" -type f
```

## Programmatic API Usage

The application exposes a REST API that you can use programmatically. See `demo-script.js` for a complete example:

```javascript
// List instances
const response = await fetch('/api/instances');
const { instances } = await response.json();

// Create instance
const createResponse = await fetch('/api/instances', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'my-sandbox',
    repoUrl: 'https://github.com/username/repo.git'  // Optional
  })
});

// Execute command
const commandResponse = await fetch('/api/commands', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instanceId: 'instance-id',
    command: 'ls -la'
  })
});
```

### API Endpoints

- `GET /api/instances` - List all instances
- `POST /api/instances` - Create new instance
- `POST /api/instances/{id}/start` - Start instance
- `POST /api/instances/{id}/stop` - Stop instance
- `POST /api/instances/{id}/restart` - Restart instance
- `POST /api/instances/{id}/destroy` - Destroy instance
- `POST /api/commands` - Execute command on instance

## Architecture

### Frontend Components

- **SandboxForm**: Form component for creating new sandboxes
- **SandboxList**: Display and manage existing sandbox instances
- **CommandTerminal**: Interactive terminal for command execution
- **FileExplorer**: File browser with content viewer
- **UI Components**: Reusable components built with shadcn/ui

### SDK Integration

The application uses the Lightfast Computer SDK with the Vercel provider:

```typescript
import { createLightfastComputer } from '@lightfastai/computer';

const computer = createLightfastComputer({
  provider: 'vercel',
  vercelToken: process.env.VERCEL_TOKEN,
  projectId: process.env.VERCEL_PROJECT_ID,
  teamId: process.env.VERCEL_TEAM_ID,
});
```

### Key Features Implementation

1. **Real-time Updates**: Automatic refresh every 10 seconds
2. **Error Handling**: Comprehensive error boundaries and user feedback
3. **Loading States**: Visual indicators for all async operations
4. **Responsive Design**: Mobile-first approach with Tailwind CSS
5. **Type Safety**: Full TypeScript integration with proper types

## Development

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page component
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── command-terminal.tsx
│   ├── file-explorer.tsx
│   ├── sandbox-form.tsx
│   └── sandbox-list.tsx
├── lib/                  # Utility libraries
│   ├── computer.ts       # SDK configuration
│   └── utils.ts          # Helper functions
└── hooks/                # Custom React hooks (if needed)
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library
- **Lightfast Computer SDK** - Vercel Sandbox integration

## Troubleshooting

### Common Issues

1. **"VERCEL_TOKEN environment variable is required"**
   - Make sure you've created a `.env.local` file
   - Verify your Vercel token is correctly set
   - Check that the token has the necessary permissions

2. **Sandboxes not starting**
   - Verify your Vercel account has sufficient quota
   - Check the browser console for detailed error messages
   - Ensure your token hasn't expired

3. **Commands failing in terminal**
   - Make sure the sandbox is in "running" state
   - Some commands may not be available in the sandbox environment
   - Check command syntax and permissions

4. **Files not loading**
   - Verify the file path exists in the sandbox
   - Some files may be too large to display
   - Check file permissions

### Getting Help

1. **Check the browser console** for detailed error messages
2. **Review the SDK documentation** for API details
3. **Open an issue** on the GitHub repository
4. **Check Vercel status** for platform-wide issues

## Contributing

This example is part of the Lightfast Computer SDK project. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the main repository LICENSE file for details.

## Related Links

- [Lightfast Computer SDK](https://github.com/lightfastai/computer)
- [Vercel Sandbox Documentation](https://vercel.com/docs/sandbox)
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)