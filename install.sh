#!/bin/bash

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
  echo "Bun is not installed. Please install Bun first: https://bun.sh/"
  exit 1
fi

# Clean any existing build artifacts
echo "Cleaning existing build artifacts..."
rm -rf .turbo
find . -name "dist" -type d -exec rm -rf {} +
find . -name "node_modules" -type d -exec rm -rf {} +

# Install dependencies
echo "Installing dependencies..."
bun install

# Build all packages
echo "Building all packages..."
bun run build

echo "✅ Setup completed successfully!"
echo "Run 'bun run dev' to start the development server."
