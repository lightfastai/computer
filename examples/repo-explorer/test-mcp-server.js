#!/usr/bin/env node

/**
 * Test script to verify Playwright MCP server can be started
 * Run with: node test-mcp-server.js
 */

const { spawn } = require('child_process');

console.log('Testing Playwright MCP Server configurations...\n');

const configs = [
  {
    name: 'Official @playwright/mcp',
    command: 'npx',
    args: ['@playwright/mcp@latest', '--help']
  },
  {
    name: 'ExecuteAutomation MCP Server',
    command: 'npx',
    args: ['@executeautomation/playwright-mcp-server@latest', '--help']
  }
];

async function testConfig(config) {
  console.log(`Testing: ${config.name}`);
  console.log(`Command: ${config.command} ${config.args.join(' ')}`);
  
  return new Promise((resolve) => {
    const proc = spawn(config.command, config.args, { 
      stdio: 'pipe',
      shell: true 
    });
    
    let output = '';
    let error = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Success!\n');
        if (output) console.log('Output:', output.trim(), '\n');
      } else {
        console.log('❌ Failed with code:', code);
        if (error) console.log('Error:', error.trim(), '\n');
      }
      resolve();
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      proc.kill();
      console.log('⏱️ Timeout - killing process\n');
      resolve();
    }, 30000);
  });
}

async function runTests() {
  for (const config of configs) {
    await testConfig(config);
  }
  
  console.log('\nRecommended Claude Desktop configuration:');
  console.log(`
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
`);
  
  console.log('If the above doesn\'t work, try installing globally:');
  console.log('npm install -g @playwright/mcp');
  console.log('Then use: {"command": "playwright-mcp"} in the config\n');
}

runTests();