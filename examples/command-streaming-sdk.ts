#!/usr/bin/env bun

/**
 * Example: Execute commands using the SDK
 * 
 * This example demonstrates how to:
 * 1. Execute commands on a Fly.io instance using the SDK
 * 2. Handle output with callbacks
 * 3. Handle different command types
 */

import createLightfastComputer from '@lightfastai/computer';

// Initialize the SDK
const computer = createLightfastComputer({
  flyApiToken: process.env.FLY_API_TOKEN || 'your_fly_api_token_here',
  appName: process.env.FLY_APP_NAME || 'lightfast-worker-instances'
});

async function executeCommand(instanceId: string, command: string, args: string[] = []) {
  console.log(`\n🚀 Executing: ${command} ${args.join(' ')}`);
  
  const result = await computer.commands.execute({
    instanceId,
    command,
    args,
    timeout: 30000,
    onData: (data) => {
      // Handle stdout data
      process.stdout.write(data);
    },
    onError: (error) => {
      // Handle stderr data
      process.stderr.write(error);
    }
  });

  if (result.isErr()) {
    console.error('❌ Error:', result.error.message);
    if (result.error.technicalDetails) {
      console.error('Technical details:', result.error.technicalDetails);
    }
    return;
  }

  console.log(`\n✅ Completed with exit code: ${result.value.exitCode}`);
}

async function runExamples(instanceId: string) {
  // First, ensure the instance exists and is running
  const instanceResult = await computer.instances.get(instanceId);
  
  if (instanceResult.isErr()) {
    console.error('Failed to get instance:', instanceResult.error.message);
    return;
  }

  const instance = instanceResult.value;
  console.log('Instance status:', instance.status);
  
  if (instance.status !== 'running') {
    console.log('Starting instance...');
    const startResult = await computer.instances.start(instanceId);
    if (startResult.isErr()) {
      console.error('Failed to start instance:', startResult.error.message);
      return;
    }
  }

  // Example 1: List files
  await executeCommand(instanceId, 'ls', ['-la']);
  
  // Example 2: Check environment
  await executeCommand(instanceId, 'env');
  
  // Example 3: Check disk usage
  await executeCommand(instanceId, 'df', ['-h']);
  
  // Example 4: Run a simple script
  await executeCommand(instanceId, 'bash', ['-c', 'echo "Hello from Fly.io instance!"']);
}

// Get instance ID from command line or create a new one
async function main() {
  let instanceId = process.argv[2];
  
  if (!instanceId) {
    console.log('No instance ID provided, creating a new instance...');
    
    const createResult = await computer.instances.create({
      name: 'command-example-instance',
      region: 'iad',
      size: 'shared-cpu-1x',
      memoryMb: 256,
    });
    
    if (createResult.isErr()) {
      console.error('Failed to create instance:', createResult.error.message);
      if (createResult.error.technicalDetails) {
        console.error('Technical details:', createResult.error.technicalDetails);
      }
      process.exit(1);
    }
    
    instanceId = createResult.value.id;
    console.log('Created instance:', instanceId);
  }

  console.log('🎯 Command Execution SDK Example');
  console.log('Instance ID:', instanceId);
  
  await runExamples(instanceId);
  
  // Clean up if we created the instance
  if (!process.argv[2]) {
    console.log('\nCleaning up...');
    const destroyResult = await computer.instances.destroy(instanceId);
    if (destroyResult.isOk()) {
      console.log('Instance destroyed successfully');
    }
  }
}

main()
  .then(() => {
    console.log('\n✨ All commands executed successfully!');
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });