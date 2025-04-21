import { env } from '../env.js';
import { initializeClient, startChat } from './llm-client.js';

async function main() {
  try {
    console.log('Initializing AI client...');
    const context = await initializeClient(env.ANTHROPIC_API_KEY);

    console.log('Starting chat session...');
    await startChat(context);
  } catch (error) {
    console.error('Error running AI client:', error);
    process.exit(1);
  }
}

main();
