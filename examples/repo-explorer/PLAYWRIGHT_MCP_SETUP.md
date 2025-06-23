# Playwright MCP Setup Guide

This guide explains how to use Playwright with Claude Code and the Playwright MCP (Model Context Protocol) server.

## Prerequisites

- Playwright has been installed and configured in this project
- Claude Code Desktop is installed
- MCP Playwright server is available

## Installation Complete

The following has been set up in this project:

1. **Dependencies installed:**
   - `@playwright/test` - Playwright test runner
   - `playwright` - Playwright library

2. **Configuration:**
   - `playwright.config.ts` - Main Playwright configuration
   - Test directory: `e2e/`
   - Base URL: `http://localhost:3000` (configurable via `PLAYWRIGHT_BASE_URL` env var)

3. **Test structure:**
   ```
   e2e/
   ├── tests/
   │   ├── homepage.spec.ts
   │   ├── instance-creation.spec.ts
   │   └── repository-cloning.spec.ts
   ├── fixtures/
   │   └── test-data.ts
   └── utils/
       └── helpers.ts
   ```

## Available Scripts

- `bun run test:e2e` - Run all E2E tests
- `bun run test:e2e:ui` - Run tests with Playwright UI mode
- `bun run test:e2e:debug` - Run tests in debug mode
- `bun run test:e2e:headed` - Run tests with browser visible
- `bun run test:e2e:codegen` - Open Playwright codegen tool
- `bun run test:e2e:report` - Show test report

## Setting up Playwright MCP

To use Playwright with Claude Code's MCP integration:

1. **Configure MCP in Claude Desktop:**
   
   Add the Playwright server to your Claude Desktop configuration:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

   **Option 1: ExecuteAutomation's Playwright MCP Server (Recommended - Working)**
   ```json
   {
     "mcpServers": {
       "playwright": {
         "command": "npx",
         "args": ["-y", "@executeautomation/playwright-mcp-server"]
       }
     }
   }
   ```

   **Option 2: Official Microsoft Playwright MCP**
   ```json
   {
     "mcpServers": {
       "playwright": {
         "command": "npx",
         "args": ["@playwright/mcp@latest"]
       }
     }
   }
   ```

   **Important:** After editing the config file:
   1. Completely quit Claude Desktop
   2. On Windows: Check Task Manager and end any Claude processes
   3. On macOS: Check Activity Monitor and quit any Claude processes
   4. Restart Claude Desktop

   **Alternative Installation Methods:**
   
   If npx doesn't work, install globally:
   ```bash
   # For ExecuteAutomation version:
   npm install -g @executeautomation/playwright-mcp-server
   
   # Then use in config:
   {
     "mcpServers": {
       "playwright": {
         "command": "playwright-mcp-server"
       }
     }
   }
   ```

   Or use mcp-get:
   ```bash
   npx @michaellatman/mcp-get@latest install @executeautomation/playwright-mcp-server
   ```

2. **Using Playwright MCP in Claude:**
   
   Once configured, you can use natural language to:
   - Navigate to pages
   - Click elements
   - Fill forms
   - Take screenshots
   - Assert page content
   - Run automated tests

3. **Example commands in Claude:**
   ```
   - "Navigate to localhost:3000"
   - "Click the Create Instance button"
   - "Fill the instance name with 'test-instance'"
   - "Take a screenshot of the current page"
   - "Check if the heading 'Repository Explorer' is visible"
   ```

## Running Tests

1. **Start the development server:**
   ```bash
   bun run dev
   ```

2. **Run tests in another terminal:**
   ```bash
   bun run test:e2e
   ```

3. **View test results:**
   ```bash
   bun run test:e2e:report
   ```

## Writing Tests

Example test structure:

```typescript
import { test, expect } from '@playwright/test';

test('should perform action', async ({ page }) => {
  await page.goto('/');
  await page.click('button[name="Submit"]');
  await expect(page.locator('.success')).toBeVisible();
});
```

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Mock API responses** for consistent testing
3. **Use page objects** for complex UI interactions
4. **Run tests in CI** with the GitHub reporter
5. **Keep tests independent** - each test should be able to run in isolation

## Troubleshooting

### Playwright Tests
- **Tests failing locally:** Ensure the dev server is running on port 3000
- **Browser not launching:** Run `bunx playwright install` to reinstall browsers
- **Timeout errors:** Increase timeout in `playwright.config.ts`

### MCP Server Issues
- **"failed" status in Claude Desktop:**
  1. Check the exact error in Claude Desktop's MCP server status
  2. Try the alternative installation method (global npm install)
  3. Ensure Node.js is installed and available in PATH
  4. Check Claude Desktop logs: `~/Library/Logs/Claude/` (macOS)

- **"npx: command not found":**
  - Install Node.js from https://nodejs.org/
  - Or use a Node version manager like nvm

- **Server starts but doesn't work:**
  1. Completely restart Claude Desktop (kill all processes)
  2. Check if another MCP server is conflicting
  3. Try removing and re-adding the server configuration

### Recommended Working Configuration

Based on testing, the most reliable configuration is:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    }
  }
}
```

The `-y` flag ensures npx automatically installs the package without prompting.

## Environment Variables

- `PLAYWRIGHT_BASE_URL` - Override the base URL (default: http://localhost:3000)
- `CI` - Set to true in CI environments for optimized settings
- `FLY_API_TOKEN` - Used in test fixtures for API testing