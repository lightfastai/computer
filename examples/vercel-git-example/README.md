# Vercel Git Example - Repository Explorer

A specialized demonstration of the Lightfast Computer SDK's Vercel Sandbox provider, focused on git repository exploration and visualization. This Next.js application showcases advanced git operations, file tree navigation, and repository analysis capabilities.

## 🎯 Purpose

This example is THE reference implementation for exploring git repositories using Vercel Sandbox. It demonstrates how to build a comprehensive git repository explorer with features like branch navigation, commit history, file browsing with syntax highlighting, and real-time repository analysis.

## ✨ Git-Focused Features

### 📊 Repository Analysis
- **Clone Repositories**: Clone any public git repository into a sandbox
- **Branch Navigation**: View and switch between branches
- **Commit History**: Browse commit logs with detailed information
- **Git Status**: Real-time repository status monitoring
- **File Changes**: Track modified, added, and deleted files

### 🌳 Advanced File Tree Explorer
- **Git-Aware Navigation**: Browse repository structure with git status indicators
- **Syntax Highlighting**: View file contents with language-specific highlighting
- **File History**: View git history for individual files
- **Blame View**: See who last modified each line
- **Diff Viewer**: Compare file changes between commits

### 🔍 Repository Insights
- **Branch Visualization**: Visual branch graph and relationships
- **Contributor Stats**: See who contributes to the repository
- **File Type Analysis**: Breakdown of languages and file types
- **Repository Metadata**: Size, last update, default branch info

### 💻 Interactive Git Terminal
- **Git Commands**: Execute any git command directly
- **Command Suggestions**: Smart suggestions for common git operations
- **Output Formatting**: Properly formatted git output with colors
- **Command History**: Navigate through previous git commands

## 🚀 Getting Started

### Prerequisites

- Bun 1.0+ (preferred) or Node.js 18+
- A Vercel account with API access
- Vercel API token (required)

### Quick Setup

```bash
cd examples/vercel-git-example
chmod +x setup-demo.sh
./setup-demo.sh
```

The setup script will:
- Create `.env.local` from the example
- Install dependencies with bun
- Build the project to verify setup
- Provide next steps

### Manual Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lightfastai/computer.git
   cd computer/examples/vercel-git-example
   ```

2. **Install dependencies**:
   ```bash
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
3. Give it a name (e.g., "Git Explorer")
4. Select appropriate scopes
5. Copy the token to your `.env.local`

### Running the Application

```bash
bun dev
```

Then open [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Exploring a Repository

1. **Create a Sandbox** with a git repository URL
2. **Wait for Clone** to complete (status shown in real-time)
3. **Navigate** using the enhanced file tree with git indicators
4. **View Files** with syntax highlighting
5. **Check History** using the git history panel
6. **Switch Branches** from the branch selector
7. **Execute Commands** in the integrated terminal

### Git Operations Examples

#### View Repository History
```bash
git log --oneline --graph --all --decorate
```

#### Check File History
```bash
git log --follow -- path/to/file.js
```

#### View File Changes
```bash
git diff HEAD~1 -- path/to/file.js
```

#### Browse Branches
```bash
git branch -a -v
```

#### Check Contributors
```bash
git shortlog -sn --all
```

## 🏗️ Architecture

### Frontend Components

```
src/
├── components/
│   ├── git/
│   │   ├── GitFileExplorer.tsx    # Enhanced file tree with git status
│   │   ├── GitHistory.tsx          # Commit history viewer
│   │   ├── GitBranchSelector.tsx  # Branch navigation
│   │   ├── GitDiffViewer.tsx      # File diff display
│   │   └── GitStatusPanel.tsx     # Repository status
│   ├── ui/                         # Reusable UI components
│   └── ...
├── app/
│   ├── api/
│   │   ├── git/                    # Git-specific endpoints
│   │   └── ...
│   └── page.tsx                    # Main application
└── lib/
    ├── git-utils.ts                # Git operation helpers
    └── ...
```

### API Endpoints

- `POST /api/git/clone` - Clone a repository
- `GET /api/git/branches` - List branches
- `POST /api/git/checkout` - Switch branches
- `GET /api/git/log` - Get commit history
- `GET /api/git/status` - Repository status
- `GET /api/git/diff` - File differences
- `GET /api/git/blame` - File blame info

### Key Features Implementation

1. **Git Status Integration**: File tree shows git status indicators (modified, new, deleted)
2. **Smart Caching**: Caches git metadata for performance
3. **Streaming Updates**: Real-time output for long-running git operations
4. **Error Recovery**: Graceful handling of git errors
5. **Security**: Sanitization of git commands and paths

## 🛠️ Development

### Available Scripts

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun lint         # Run ESLint
bun type-check   # Run TypeScript checking
```

### Extending Git Features

To add new git functionality:

1. Add API endpoint in `app/api/git/`
2. Create component in `components/git/`
3. Add utility functions in `lib/git-utils.ts`
4. Update the UI to expose the feature

### Example: Adding Git Stash Support

```typescript
// app/api/git/stash/route.ts
export async function POST(request: NextRequest) {
  const { instanceId, operation } = await request.json();
  
  const result = await computer.commands.execute({
    instanceId,
    command: 'git',
    args: ['stash', operation]
  });
  
  return NextResponse.json(result);
}
```

## 🎨 UI/UX Features

- **Git-Aware File Icons**: Different icons for staged, modified, untracked files
- **Branch Indicator**: Current branch always visible
- **Commit Graph**: Visual representation of commit history
- **Quick Actions**: One-click operations for common git tasks
- **Keyboard Shortcuts**: Vim-style navigation in file tree
- **Dark Mode**: Optimized for long coding sessions

## 🚦 Performance Optimizations

- **Lazy Loading**: Load file contents only when needed
- **Virtual Scrolling**: Handle large repositories efficiently
- **Debounced Search**: Smart filtering in file tree
- **Cached Git Data**: Reduce redundant git operations
- **Progressive Enhancement**: Core features work without JavaScript

## 🔒 Security Considerations

- **Command Sanitization**: All git commands are validated
- **Path Traversal Protection**: Prevents accessing files outside repo
- **Rate Limiting**: Prevents abuse of git operations
- **Token Scoping**: Minimal permissions required

## 🐛 Troubleshooting

### Common Issues

1. **"Repository clone failed"**
   - Check if the repository URL is valid
   - Ensure the repository is public
   - Verify network connectivity

2. **"Git operations timing out"**
   - Large repositories may take time
   - Check sandbox resource limits
   - Consider shallow clones for huge repos

3. **"File tree not updating"**
   - Refresh the file tree manually
   - Check git status in terminal
   - Verify sandbox is running

## 🤝 Contributing

This example showcases best practices for git integration with Vercel Sandbox. Contributions that enhance git functionality are especially welcome!

## 📚 Related Resources

- [Lightfast Computer SDK](https://github.com/lightfastai/computer)
- [Vercel Sandbox Documentation](https://vercel.com/docs/sandbox)
- [Git Documentation](https://git-scm.com/doc)
- [Next.js Documentation](https://nextjs.org/docs)

## 📄 License

MIT License - see the main repository LICENSE file for details.