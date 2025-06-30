#!/bin/bash

echo "🚀 Setting up Vercel Git Example - Repository Explorer"
echo ""

# Check if environment file exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env.local and add your Vercel credentials:"
    echo "   - VERCEL_TOKEN: Get from https://vercel.com/account/tokens"
    echo "   - VERCEL_PROJECT_ID (optional)"
    echo "   - VERCEL_TEAM_ID (optional)"
    echo ""
else
    echo "✅ .env.local already exists"
    echo ""
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    bun install
    echo "✅ Dependencies installed"
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

# Build the project to ensure everything works
echo "🔨 Building project..."
bun run build
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
    echo ""
else
    echo "❌ Build failed - check your environment variables"
    exit 1
fi

echo "🎉 Setup complete!"
echo ""
echo "To start the development server:"
echo "  bun run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "📚 Features available:"
echo "  • Create Vercel Sandbox instances with git repositories"
echo "  • Clone and explore any public git repository"
echo "  • Browse commit history and branch structures"
echo "  • Git-aware file tree with status indicators"
echo "  • View file diffs and blame information"
echo "  • Execute git commands in interactive terminal"
echo "  • Syntax highlighting for code viewing"