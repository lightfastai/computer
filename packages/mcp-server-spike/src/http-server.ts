import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createMcpServer } from './server.js';

/**
 * Starts an MCP server using HTTP transport
 */
async function startHttpServer() {
  try {
    console.log('Starting MCP server with HTTP transport...');

    // Create the Express app
    const app = express();
    app.use(express.json());

    // Create the MCP server
    const server = createMcpServer();

    // Create the HTTP transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Set to undefined for stateless server
    });

    // Connect the server to the transport
    await server.connect(transport);

    // Set up routes for the server
    app.post('/mcp', async (req, res) => {
      console.log('Received MCP request:', req.body);
      try {
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    // Start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`MCP HTTP Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}

// Start the server
startHttpServer();
