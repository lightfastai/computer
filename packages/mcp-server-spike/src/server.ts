import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

/**
 * Creates and configures an MCP server with resources, tools, and prompts
 */
export function createMcpServer(): McpServer {
  // Create an MCP server
  const server = new McpServer({
    name: 'Lightfast MCP Server',
    version: '0.1.0',
  });

  // Add a simple resource that returns system information
  server.resource('system-info', 'system://info', async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(
          {
            platform: process.platform,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
          },
          null,
          2,
        ),
      },
    ],
  }));

  // Add a dynamic resource with parameters
  server.resource(
    'greeting',
    new ResourceTemplate('greeting://{name}', { list: undefined }),
    async (uri, { name }) => ({
      contents: [
        {
          uri: uri.href,
          text: `Hello, ${name}! Welcome to the Lightfast MCP Server.`,
        },
      ],
    }),
  );

  // Add a simple calculator tool
  server.tool(
    'calculate',
    {
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    },
    async (args) => {
      const { operation, a, b } = args;

      let result: number;

      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          if (b === 0) {
            return {
              content: [{ type: 'text', text: 'Error: Division by zero' }],
              isError: true,
            };
          }
          result = a / b;
          break;
        default:
          return {
            content: [{ type: 'text', text: 'Error: Invalid operation' }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text', text: `Result: ${result}` }],
      };
    },
  );

  // Add a prompt template for code review
  server.prompt(
    'review-code',
    {
      code: z.string(),
      language: z.string().optional(),
    },
    (args) => {
      const { code, language } = args;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please review this ${language || ''} code:\n\n${code}`,
            },
          },
        ],
      };
    },
  );

  return server;
}
