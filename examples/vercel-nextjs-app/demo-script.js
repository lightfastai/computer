/**
 * Demo script showing how to interact with the Vercel Sandbox API
 * This script demonstrates the programmatic API usage
 */

const baseUrl = 'http://localhost:3000/api';

async function demoWorkflow() {
  console.log('🚀 Starting Vercel Sandbox Demo Workflow...\n');

  try {
    // 1. List existing instances
    console.log('📋 Listing existing instances...');
    const listResponse = await fetch(`${baseUrl}/instances`);
    const { instances } = await listResponse.json();
    console.log(`Found ${instances.length} existing instances\n`);

    // 2. Create a new instance
    console.log('🆕 Creating new sandbox instance...');
    const createResponse = await fetch(`${baseUrl}/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'demo-sandbox',
        repoUrl: 'https://github.com/vercel/examples.git'  // Optional
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create instance: ${await createResponse.text()}`);
    }
    
    const { instance } = await createResponse.json();
    console.log(`✅ Created instance: ${instance.name} (${instance.id})\n`);

    // 3. Wait for instance to be ready (simplified)
    console.log('⏳ Waiting for instance to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Execute a command
    console.log('💻 Executing command: ls -la');
    const commandResponse = await fetch(`${baseUrl}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: instance.id,
        command: 'ls -la'
      })
    });

    if (commandResponse.ok) {
      const result = await commandResponse.json();
      console.log('📤 Command output:');
      console.log(result.stdout);
      console.log('');
    } else {
      console.log('❌ Command failed\n');
    }

    // 5. Cleanup - destroy the instance
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
    console.error('❌ Demo failed:', error.message);
  }

  console.log('\n🎉 Demo workflow complete!');
}

// Check if running directly
if (typeof window === 'undefined') {
  demoWorkflow();
}

module.exports = { demoWorkflow };