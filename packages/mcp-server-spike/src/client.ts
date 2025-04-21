import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * Creates and connects an MCP client
 * @param transportType The type of transport to use ('stdio' or 'http')
 * @param serverUrl The URL of the server (only used for HTTP transport)
 */
async function createClient(transportType: 'stdio' | 'http', serverUrl?: string) {
  try {
    console.log(`Creating MCP client with ${transportType} transport...`);

    // Create the client
    const client = new Client({
      name: 'Lightfast MCP Client',
      version: '0.1.0',
    });

    // Create the transport
    let transport: StdioClientTransport | StreamableHTTPClientTransport;
    if (transportType === 'stdio') {
      transport = new StdioClientTransport({
        command: 'bun',
        args: ['dist/stdio-server.js'],
      });
    } else {
      if (!serverUrl) {
        throw new Error('Server URL is required for HTTP transport');
      }
      transport = new StreamableHTTPClientTransport(new URL(serverUrl));
    }

    // Connect the client to the transport
    await client.connect(transport);

    console.log('MCP client connected successfully');
    return client;
  } catch (error) {
    console.error('Error creating MCP client:', error);
    throw error;
  }
}

/**
 * Tests the MCP client by listing resources, tools, and prompts
 * @param client The MCP client to test
 */
async function testClient(client: Client) {
  try {
    console.log('Testing MCP client...');

    // List resources
    console.log('Listing resources...');
    const resources = await client.listResources();
    console.log('Resources:', resources);

    // Read a resource
    console.log('Reading system-info resource...');
    const systemInfo = await client.readResource({
      uri: 'system://info',
    });
    console.log('System info:', systemInfo);

    // Read a dynamic resource
    console.log('Reading greeting resource...');
    const greeting = await client.readResource({
      uri: 'greeting://World',
    });
    console.log('Greeting:', greeting);

    // List tools
    console.log('Listing tools...');
    const tools = await client.listTools();
    console.log('Tools:', tools);

    // Call a tool
    console.log('Calling calculate tool...');
    const result = await client.callTool({
      name: 'calculate',
      arguments: {
        operation: 'add',
        a: 5,
        b: 3,
      },
    });
    console.log('Calculate result:', result);

    // List prompts
    console.log('Listing prompts...');
    const prompts = await client.listPrompts();
    console.log('Prompts:', prompts);

    // Get a prompt
    console.log('Getting review-code prompt...');
    const prompt = await client.getPrompt({
      name: 'review-code',
      arguments: {
        code: 'function add(a, b) { return a + b; }',
        language: 'JavaScript',
      },
    });
    console.log('Prompt:', prompt);

    console.log('MCP client test completed successfully');
  } catch (error) {
    console.error('Error testing MCP client:', error);
    throw error;
  }
}

/**
 * Main function to run the client
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const transportType = (args[0] as 'stdio' | 'http') || 'stdio';
    const serverUrl = args[1] || 'http://localhost:3000/mcp';

    // Create and test the client
    const client = await createClient(transportType, serverUrl);
    await testClient(client);

    // Note: The client doesn't have a disconnect method in the current SDK version
    console.log('MCP client test completed');
  } catch (error) {
    console.error('Error running MCP client:', error);
    process.exit(1);
  }
}

// Run the main function
main();
