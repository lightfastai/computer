#!/usr/bin/env bun

/**
 * Example: Execute commands with streaming output
 * 
 * This example demonstrates how to:
 * 1. Execute commands on a Fly.io instance
 * 2. Stream output in real-time
 * 3. Handle different command types
 */

const API_URL = 'http://localhost:3000/api';

// Helper function to parse SSE stream
async function* parseSSEStream(response: Response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) return;
  
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    
    // Keep the last incomplete line in buffer
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      }
    }
  }
}

async function executeCommandWithStreaming(instanceId: string, command: string, args: string[] = []) {
  console.log(`\n🚀 Executing: ${command} ${args.join(' ')}`);
  
  const response = await fetch(`${API_URL}/commands/${instanceId}/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      command,
      args,
      timeout: 30000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to execute command: ${await response.text()}`);
  }

  // Process streaming response
  for await (const event of parseSSEStream(response)) {
    switch (event.type) {
      case 'status':
        console.log('📋', event.message);
        break;
      case 'stdout':
        process.stdout.write(event.data);
        break;
      case 'stderr':
        process.stderr.write(event.data);
        break;
      case 'complete':
        console.log(`\n✅ Completed with exit code: ${event.exitCode}`);
        break;
      case 'error':
        console.error('❌ Error:', event.message);
        break;
    }
  }
}

async function runExamples(instanceId: string) {
  // Example 1: List files
  await executeCommandWithStreaming(instanceId, 'ls', ['-la']);
  
  // Example 2: Check environment
  await executeCommandWithStreaming(instanceId, 'env');
  
  // Example 3: Find files
  await executeCommandWithStreaming(instanceId, 'find', ['/workspace', '-name', '*.json', '-type', 'f']);
  
  // Example 4: Grep for patterns
  await executeCommandWithStreaming(instanceId, 'grep', ['-r', 'TODO', '/workspace', '--include=*.ts']);
  
  // Example 5: Check disk usage
  await executeCommandWithStreaming(instanceId, 'df', ['-h']);
}

// Get instance ID from command line or use default
const instanceId = process.argv[2] || 'test-instance-id';

console.log('🎯 Command Streaming Example');
console.log('Instance ID:', instanceId);

runExamples(instanceId)
  .then(() => {
    console.log('\n✨ All commands executed successfully!');
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });