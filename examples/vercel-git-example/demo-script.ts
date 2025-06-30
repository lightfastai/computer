/**
 * Git Repository Explorer Demo Script
 * This script demonstrates git-focused API usage with the Vercel Sandbox
 */

const baseUrl = 'http://localhost:3000/api';

interface Instance {
  id: string;
  name: string;
  status: string;
}

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function gitExplorerDemo(): Promise<void> {
  console.log('🚀 Starting Git Repository Explorer Demo...\n');

  try {
    // 1. List existing instances
    console.log('📋 Listing existing instances...');
    const listResponse = await fetch(`${baseUrl}/instances`);
    const { instances }: { instances: Instance[] } = await listResponse.json();
    console.log(`Found ${instances.length} existing instances\n`);

    // 2. Create a new instance with a git repository
    console.log('🆕 Creating sandbox with Next.js repository...');
    const createResponse = await fetch(`${baseUrl}/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'nextjs-explorer',
        repoUrl: 'https://github.com/vercel/next.js.git'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create instance: ${await createResponse.text()}`);
    }
    
    const { instance }: { instance: Instance } = await createResponse.json();
    console.log(`✅ Created instance: ${instance.name} (${instance.id})`);
    console.log('📦 Cloning repository...\n');

    // 3. Wait for instance and clone to complete
    console.log('⏳ Waiting for repository clone to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 4. Execute git status
    console.log('📊 Checking git status...');
    const statusResponse = await fetch(`${baseUrl}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: instance.id,
        command: 'git status'
      })
    });

    if (statusResponse.ok) {
      const result: CommandResult = await statusResponse.json();
      console.log('Git Status Output:');
      console.log(result.stdout);
      console.log('');
    }

    // 5. Get commit history
    console.log('📜 Getting recent commits...');
    const logResponse = await fetch(`${baseUrl}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: instance.id,
        command: 'git log --oneline -5'
      })
    });

    if (logResponse.ok) {
      const result: CommandResult = await logResponse.json();
      console.log('Recent Commits:');
      console.log(result.stdout);
      console.log('');
    }

    // 6. List branches
    console.log('🌳 Listing branches...');
    const branchResponse = await fetch(`${baseUrl}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: instance.id,
        command: 'git branch -r | head -10'
      })
    });

    if (branchResponse.ok) {
      const result: CommandResult = await branchResponse.json();
      console.log('Remote Branches (first 10):');
      console.log(result.stdout);
      console.log('');
    }

    // 7. Check repository size
    console.log('📏 Checking repository statistics...');
    const sizeResponse = await fetch(`${baseUrl}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: instance.id,
        command: 'git count-objects -vH'
      })
    });

    if (sizeResponse.ok) {
      const result: CommandResult = await sizeResponse.json();
      console.log('Repository Statistics:');
      console.log(result.stdout);
      console.log('');
    }

    // 8. Show contributors
    console.log('👥 Top contributors...');
    const contributorsResponse = await fetch(`${baseUrl}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: instance.id,
        command: 'git shortlog -sn --all | head -5'
      })
    });

    if (contributorsResponse.ok) {
      const result: CommandResult = await contributorsResponse.json();
      console.log('Top 5 Contributors:');
      console.log(result.stdout);
      console.log('');
    }

    // 9. Cleanup - destroy the instance
    console.log('🗑️  Cleaning up - destroying instance...');
    const destroyResponse = await fetch(`${baseUrl}/instances/${instance.id}/destroy`, {
      method: 'POST'
    });

    if (destroyResponse.ok) {
      console.log('✅ Instance destroyed successfully');
    } else {
      console.log('❌ Failed to destroy instance');
    }

  } catch (error) {
    console.error('❌ Demo failed:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n🎉 Git Explorer demo complete!');
  console.log('💡 Try the web UI for a full git exploration experience');
}

// Alternative demo with the git API endpoint
async function gitApiDemo(): Promise<void> {
  console.log('\n🔧 Git API Endpoint Demo...\n');

  try {
    // Assuming we have an instance ID from the previous demo
    const instanceId = 'your-instance-id';

    // Example: Get git status using the git API
    console.log('Using Git API endpoint...');
    const gitStatusResponse = await fetch(`${baseUrl}/git`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId,
        operation: 'status',
        path: '/'
      })
    });

    if (gitStatusResponse.ok) {
      const result = await gitStatusResponse.json();
      console.log('Git API Response:', result);
    }

  } catch (error) {
    console.error('Git API demo failed:', error instanceof Error ? error.message : String(error));
  }
}

// Check if running directly
if (typeof window === 'undefined') {
  gitExplorerDemo();
}

export { gitExplorerDemo, gitApiDemo };