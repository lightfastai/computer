#!/usr/bin/env bun

/**
 * Example: Fly.io Provider with Git Clone and File Operations
 * 
 * This example demonstrates how to:
 * 1. Use the new provider abstraction pattern with Fly.io
 * 2. Create an instance with proper configuration
 * 3. Clone a Git repository
 * 4. List files and directories
 * 5. Execute various commands
 * 6. Handle errors with the Result pattern
 */

import createLightfastComputer from '@lightfastai/computer';

// Initialize the SDK with the new provider configuration
const computer = createLightfastComputer({
  provider: 'fly',
  flyApiToken: process.env.FLY_API_TOKEN || 'your_fly_api_token_here',
  appName: process.env.FLY_APP_NAME || 'lightfast-worker-instances'
});

async function executeCommand(instanceId: string, command: string, args: string[] = [], description?: string) {
  if (description) {
    console.log(`\n🚀 ${description}`);
  }
  console.log(`Executing: ${command} ${args.join(' ')}`);
  
  const result = await computer.commands.execute({
    instanceId,
    command,
    args,
    timeout: 60000, // 60 seconds for git operations
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
    return false;
  }

  console.log(`✅ Completed with exit code: ${result.value.exitCode}`);
  return result.value.exitCode === 0;
}

async function createInstanceAndDemo() {
  console.log('🎯 Fly.io Provider Example with Git Clone and File Operations');
  console.log('===============================================================\n');

  // Create an instance
  console.log('📦 Creating a new instance...');
  const createResult = await computer.instances.create({
    name: 'git-demo-instance',
    region: 'iad',
    size: 'shared-cpu-2x',
    memoryMb: 1024,
  });

  if (createResult.isErr()) {
    console.error('❌ Failed to create instance:', createResult.error.message);
    if (createResult.error.technicalDetails) {
      console.error('Technical details:', createResult.error.technicalDetails);
    }
    return;
  }

  const instance = createResult.value;
  console.log('✅ Created instance:', instance.id);
  console.log('Instance details:', {
    id: instance.id,
    name: instance.name,
    region: instance.region,
    size: instance.size,
    memoryMb: instance.memoryMb,
    status: instance.status
  });

  // Wait for instance to be ready
  console.log('\n⏳ Waiting for instance to be ready...');
  let retries = 0;
  const maxRetries = 30;
  
  while (retries < maxRetries) {
    const statusResult = await computer.instances.get(instance.id);
    if (statusResult.isOk() && statusResult.value.status === 'running') {
      console.log('✅ Instance is ready!');
      break;
    }
    
    console.log(`⏳ Instance status: ${statusResult.isOk() ? statusResult.value.status : 'unknown'} (${retries + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    retries++;
  }

  if (retries >= maxRetries) {
    console.error('❌ Instance failed to become ready within timeout');
    return;
  }

  // System Information
  console.log('\n📋 System Information');
  console.log('====================');
  await executeCommand(instance.id, 'uname', ['-a'], 'Getting system information');
  await executeCommand(instance.id, 'cat', ['/etc/os-release'], 'Getting OS version');
  await executeCommand(instance.id, 'df', ['-h'], 'Checking disk space');
  await executeCommand(instance.id, 'free', ['-h'], 'Checking memory usage');

  // File System Operations
  console.log('\n📁 File System Operations');
  console.log('=========================');
  await executeCommand(instance.id, 'pwd', [], 'Current working directory');
  await executeCommand(instance.id, 'ls', ['-la'], 'List files in current directory');
  await executeCommand(instance.id, 'ls', ['-la', '/'], 'List files in root directory');

  // Install Git (if not already installed)
  console.log('\n🔧 Installing Git');
  console.log('==================');
  await executeCommand(instance.id, 'apt-get', ['update'], 'Updating package list');
  await executeCommand(instance.id, 'apt-get', ['install', '-y', 'git'], 'Installing Git');
  await executeCommand(instance.id, 'git', ['--version'], 'Verifying Git installation');

  // Clone a repository
  console.log('\n📥 Git Clone Operations');
  console.log('=======================');
  
  const repoUrl = process.env.DEMO_REPO_URL || 'https://github.com/octocat/Hello-World.git';
  const cloneDir = '/tmp/demo-repo';
  
  await executeCommand(instance.id, 'git', ['clone', repoUrl, cloneDir], `Cloning repository: ${repoUrl}`);
  
  // List cloned repository contents
  console.log('\n📂 Repository Contents');
  console.log('======================');
  await executeCommand(instance.id, 'ls', ['-la', cloneDir], 'Listing cloned repository contents');
  await executeCommand(instance.id, 'find', [cloneDir, '-type', 'f'], 'Finding all files in repository');
  
  // Show git information
  console.log('\n📊 Git Repository Information');
  console.log('=============================');
  await executeCommand(instance.id, 'git', ['-C', cloneDir, 'log', '--oneline', '-5'], 'Recent commits');
  await executeCommand(instance.id, 'git', ['-C', cloneDir, 'branch', '-a'], 'Available branches');
  await executeCommand(instance.id, 'git', ['-C', cloneDir, 'remote', '-v'], 'Remote repositories');

  // File content operations
  console.log('\n📄 File Content Operations');
  console.log('===========================');
  await executeCommand(instance.id, 'find', [cloneDir, '-name', '*.md', '-o', '-name', '*.txt'], 'Finding text files');
  
  // Try to read README if it exists
  const readmeResult = await executeCommand(instance.id, 'ls', [cloneDir + '/README.md'], 'Checking for README');
  if (readmeResult) {
    await executeCommand(instance.id, 'cat', [cloneDir + '/README.md'], 'Reading README.md');
  }

  // Create a new file and demonstrate file operations
  console.log('\n✏️ File Creation and Editing');
  console.log('=============================');
  const testFile = '/tmp/test-file.txt';
  await executeCommand(instance.id, 'echo', ['Hello from Lightfast Computer SDK!'], 'Creating test content');
  await executeCommand(instance.id, 'bash', ['-c', `echo "Hello from Lightfast Computer SDK!" > ${testFile}`], 'Writing to test file');
  await executeCommand(instance.id, 'cat', [testFile], 'Reading test file');
  await executeCommand(instance.id, 'wc', ['-l', testFile], 'Counting lines in test file');
  await executeCommand(instance.id, 'ls', ['-la', testFile], 'File details');

  // Network and process information
  console.log('\n🌐 Network and Process Information');
  console.log('===================================');
  await executeCommand(instance.id, 'whoami', [], 'Current user');
  await executeCommand(instance.id, 'ps', ['aux'], 'Running processes');
  await executeCommand(instance.id, 'netstat', ['-tlnp'], 'Network connections');

  // Clean up
  console.log('\n🧹 Cleanup');
  console.log('==========');
  await executeCommand(instance.id, 'rm', ['-rf', cloneDir], 'Removing cloned repository');
  await executeCommand(instance.id, 'rm', ['-f', testFile], 'Removing test file');

  // Instance statistics
  console.log('\n📊 Instance Statistics');
  console.log('======================');
  const statsResult = await computer.instances.getStats();
  if (statsResult.isOk()) {
    console.log('Instance statistics:', statsResult.value);
  }

  // Ask user if they want to keep the instance
  console.log('\n🤔 Cleanup Options');
  console.log('==================');
  console.log('Instance ID:', instance.id);
  console.log('');
  console.log('To keep the instance running for further experimentation:');
  console.log(`  export INSTANCE_ID=${instance.id}`);
  console.log('  # Then you can run commands like:');
  console.log(`  bun run examples/command-streaming-sdk.ts ${instance.id}`);
  console.log('');
  console.log('To destroy the instance:');
  console.log(`  # This example will automatically destroy it in 30 seconds`);
  console.log('  # Press Ctrl+C to keep it running');

  // Auto-cleanup after delay (allow user to cancel)
  console.log('\n⏰ Auto-cleanup in 30 seconds... (Press Ctrl+C to cancel)');
  
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 30000);
      
      process.on('SIGINT', () => {
        clearTimeout(timeout);
        reject(new Error('Cleanup cancelled by user'));
      });
    });

    console.log('\n🗑️ Destroying instance...');
    const destroyResult = await computer.instances.destroy(instance.id);
    if (destroyResult.isOk()) {
      console.log('✅ Instance destroyed successfully');
    } else {
      console.error('❌ Failed to destroy instance:', destroyResult.error.message);
    }
  } catch (error) {
    console.log('\n✋ Cleanup cancelled. Instance is still running.');
    console.log(`Instance ID: ${instance.id}`);
    console.log('You can destroy it later with:');
    console.log(`  # Add your own cleanup script here`);
  }
}

// Run the example
createInstanceAndDemo()
  .then(() => {
    console.log('\n✨ Example completed successfully!');
  })
  .catch(error => {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  });