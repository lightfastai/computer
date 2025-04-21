/**
 * Lightfast MCP Server Spike
 *
 * This package provides a simple implementation of an MCP server and client
 * for testing and demonstration purposes.
 */

// Export the server creation function
export { createMcpServer } from './server.js';

// Re-export types from the MCP SDK
export * from '@modelcontextprotocol/sdk/server/mcp.js';
