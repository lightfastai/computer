import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';

/**
 * Starts an MCP server using stdio transport
 */
async function startStdioServer() {
  try {
    console.error('Starting MCP server with stdio transport...');

    // Create the MCP server
    const server = createMcpServer();

    // Create the stdio transport
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await server.connect(transport);

    console.error('MCP server started successfully with stdio transport');
  } catch (error) {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}

// Start the server
startStdioServer();
