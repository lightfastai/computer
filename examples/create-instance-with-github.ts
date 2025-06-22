#!/usr/bin/env bun

/**
 * Example: Create a Fly.io instance with GitHub access
 * 
 * This example demonstrates how to:
 * 1. Create an instance with GitHub credentials
 * 2. Clone a repository automatically
 * 3. Execute commands in the instance
 */

const API_URL = 'http://localhost:3000/api';

async function createInstanceWithGitHub() {
  console.log('🚀 Creating instance with GitHub access...');

  // Step 1: Create instance with GitHub credentials
  const createResponse = await fetch(`${API_URL}/instances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'github-dev-instance',
      region: 'iad',
      size: 'shared-cpu-2x',
      memoryMb: 1024,
      secrets: {
        githubToken: process.env.GITHUB_TOKEN || 'ghp_your_token_here',
        githubUsername: process.env.GITHUB_USERNAME || 'your-username',
      },
      repoUrl: 'https://github.com/your-org/your-repo.git',
      metadata: {
        purpose: 'development',
        owner: 'dev-team',
      },
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create instance: ${error}`);
  }

  const instance = await createResponse.json();
  console.log('✅ Instance created:', instance);

  // Wait for instance to be ready
  console.log('⏳ Waiting for instance to be ready...');
  await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds

  // Step 2: Execute commands in the instance
  console.log('🔍 Listing cloned repository contents...');
  
  const execResponse = await fetch(`${API_URL}/commands/${instance.id}/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      command: 'ls',
      args: ['-la', '/workspace'],
      timeout: 30000,
    }),
  });

  if (!execResponse.ok) {
    const error = await execResponse.text();
    throw new Error(`Failed to execute command: ${error}`);
  }

  // Parse Server-Sent Events stream
  const reader = execResponse.body?.getReader();
  const decoder = new TextDecoder();

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          switch (data.type) {
            case 'status':
              console.log('📋', data.message);
              break;
            case 'stdout':
              console.log('📤', data.data);
              break;
            case 'stderr':
              console.error('❌', data.data);
              break;
            case 'complete':
              console.log('✅ Command completed with exit code:', data.exitCode);
              break;
            case 'error':
              console.error('❌ Error:', data.message);
              break;
          }
        }
      }
    }
  }

  // Step 3: Check command history
  const historyResponse = await fetch(`${API_URL}/commands/${instance.id}/history`);
  const history = await historyResponse.json();
  console.log('\n📜 Command history:', history);

  return instance;
}

// Run the example
createInstanceWithGitHub()
  .then(instance => {
    console.log('\n✨ Success! Instance ID:', instance.id);
    console.log('💡 You can now execute more commands or manage the instance');
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });