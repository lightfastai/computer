import readline from 'node:readline/promises';
import { Anthropic } from '@anthropic-ai/sdk';
import type { Tool as AnthropicTool } from '@anthropic-ai/sdk/resources/messages/messages';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createClient } from './client.js';

// Define the Tool interface to match Anthropic's requirements
interface Tool extends AnthropicTool {
  // We're extending the Anthropic Tool type to ensure compatibility
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface ChatContext {
  llmClient: Client;
  anthropic: Anthropic;
  rl: readline.Interface;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  availableTools: Tool[];
}

export async function initializeClient(
  anthropicApiKey: string,
  transportType: 'stdio' | 'http' = 'stdio',
  serverUrl?: string,
): Promise<ChatContext> {
  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: anthropicApiKey,
  });

  // Initialize readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Initialize MCP client
  const llmClient = await createClient(transportType, serverUrl);

  // List available tools
  const toolsResponse = await llmClient.listTools();

  // Map MCP tools to Anthropic tool format
  const availableTools: Tool[] = toolsResponse.tools.map((tool) => {
    // Create a basic input schema based on the tool's parameters
    const inputSchema = {
      type: 'object' as const,
      properties: tool.parameters || {},
      required: [] as string[],
    };

    return {
      name: tool.name,
      description: tool.description,
      input_schema: inputSchema,
    };
  });

  console.log('Available tools:', availableTools.map((t) => t.name).join(', '));

  return {
    llmClient,
    anthropic,
    rl,
    conversationHistory: [],
    availableTools,
  };
}

// Function to parse AI response for tool calls
function parseToolCalls(aiResponse: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  // Look for tool call patterns in the AI response
  // This is a simple regex-based approach - in a production system, you might want to use
  // a more robust parsing method or have the AI format its response in a specific way
  const toolCallRegex = /<tool_call name="([^"]+)" arguments="([^"]+)"><\/tool_call>/g;
  let match: RegExpExecArray | null;

  // Fix the assignment in expression linter error
  match = toolCallRegex.exec(aiResponse);
  while (match !== null) {
    try {
      const name = match[1];
      const argumentsStr = match[2].replace(/&quot;/g, '"');
      const parsedArguments = JSON.parse(argumentsStr);

      toolCalls.push({ name, arguments: parsedArguments });

      // Get the next match
      match = toolCallRegex.exec(aiResponse);
    } catch (error) {
      console.error('Error parsing tool call:', error);
      // Get the next match even if there was an error
      match = toolCallRegex.exec(aiResponse);
    }
  }

  return toolCalls;
}

// Function to execute a tool call
async function executeToolCall(llmClient: Client, toolCall: ToolCall): Promise<unknown> {
  try {
    console.log(`\nExecuting tool: ${toolCall.name}`);
    const result = await llmClient.callTool({
      name: toolCall.name,
      arguments: toolCall.arguments,
    });
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error executing tool ${toolCall.name}:`, error);
    return { error: `Failed to execute tool ${toolCall.name}: ${errorMessage}` };
  }
}

export async function startChat(context: ChatContext): Promise<void> {
  const { llmClient, anthropic, rl, conversationHistory, availableTools } = context;

  console.log('AI Chat Client Started!');
  console.log('Type your messages (or "quit" to exit)');

  while (true) {
    try {
      const userInput = await rl.question('\nYou: ');

      if (userInput.toLowerCase() === 'quit') {
        break;
      }

      // Add user message to conversation history
      conversationHistory.push({ role: 'user', content: userInput });

      // Get AI response with tools
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: conversationHistory,
        tools: availableTools,
        // Use the correct tool_choice format
        tool_choice: { type: 'auto' },
      });

      // Process AI response and handle any tool calls
      const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log('\nAI:', aiResponse);

      // Add AI response to conversation history
      conversationHistory.push({ role: 'assistant', content: aiResponse });

      // Parse for tool calls
      const toolCalls = parseToolCalls(aiResponse);

      if (toolCalls.length > 0) {
        console.log(`\nDetected ${toolCalls.length} tool call(s)`);

        // Execute each tool call
        for (const toolCall of toolCalls) {
          const toolResult = await executeToolCall(llmClient, toolCall);

          // Format the tool result for the AI
          const toolResultMessage = `Tool "${toolCall.name}" returned: ${JSON.stringify(toolResult)}`;
          console.log(`\n${toolResultMessage}`);

          // Add tool result to conversation history
          conversationHistory.push({ role: 'user', content: toolResultMessage });

          // Get AI's follow-up response
          const followUpResponse = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            messages: conversationHistory,
            tools: availableTools,
            // Use the correct tool_choice format
            tool_choice: { type: 'auto' },
          });

          const followUpText =
            followUpResponse.content[0].type === 'text' ? followUpResponse.content[0].text : '';
          console.log('\nAI:', followUpText);

          // Add follow-up response to conversation history
          conversationHistory.push({ role: 'assistant', content: followUpText });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  rl.close();
}
