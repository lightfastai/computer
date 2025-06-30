#!/usr/bin/env bun

/**
 * Example: Create a Fly.io instance with GitHub access using SDK
 * 
 * This example demonstrates how to:
 * 1. Use the new provider abstraction pattern
 * 2. Create an instance with proper configuration
 * 3. Clone a GitHub repository
 * 4. Execute commands and handle streaming output
 * 5. List files and explore the repository
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
    timeout: 60000,
    onData: (data) => {
      process.stdout.write(data);
    },
    onError: (error) => {
      process.stderr.write(error);
    }
  });

  if (result.isErr()) {
    console.error('❌ Error:', result.error.message);
    return false;
  }

  console.log(`✅ Completed with exit code: ${result.value.exitCode}`);
  return result.value.exitCode === 0;
}

async function createInstanceWithGitHub() {
  console.log('🚀 Creating instance with GitHub access using SDK...');

  // Step 1: Create instance
  const createResult = await computer.instances.create({
    name: 'github-dev-instance',
    region: 'iad', 
    size: 'shared-cpu-2x',
    memoryMb: 1024,
  });

  if (createResult.isErr()) {
    console.error('❌ Failed to create instance:', createResult.error.message);
    if (createResult.error.technicalDetails) {
      console.error('Technical details:', createResult.error.technicalDetails);
    }
    throw new Error('Instance creation failed');
  }

  const instance = createResult.value;
  console.log('✅ Instance created:', {
    id: instance.id,
    name: instance.name,
    region: instance.region,
    status: instance.status
  });

  // Wait for instance to be ready
  console.log('⏳ Waiting for instance to be ready...');
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
    throw new Error('Instance failed to become ready within timeout');
  }

  // Install Git and clone repository
  await executeCommand(instance.id, 'apt-get', ['update'], 'Updating package list');
  await executeCommand(instance.id, 'apt-get', ['install', '-y', 'git'], 'Installing Git');

  // Clone the repository
  const repoUrl = process.env.GITHUB_REPO_URL || 'https://github.com/octocat/Hello-World.git';
  const workspaceDir = '/workspace';
  
  await executeCommand(instance.id, 'mkdir', ['-p', workspaceDir], 'Creating workspace directory');
  await executeCommand(instance.id, 'git', ['clone', repoUrl, workspaceDir], `Cloning repository: ${repoUrl}`);

  // Step 2: Explore the cloned repository
  console.log('\n🔍 Exploring cloned repository...');
  await executeCommand(instance.id, 'ls', ['-la', workspaceDir], 'Listing workspace contents');
  await executeCommand(instance.id, 'find', [workspaceDir, '-type', 'f'], 'Finding all files');
  
  // Show git information
  await executeCommand(instance.id, 'git', ['-C', workspaceDir, 'log', '--oneline', '-5'], 'Recent commits');
  await executeCommand(instance.id, 'git', ['-C', workspaceDir, 'status'], 'Repository status');
  
  // Read any README files
  const readmeFiles = ['README.md', 'README.txt', 'readme.md', 'readme.txt'];
  for (const readmeFile of readmeFiles) {
    const fullPath = `${workspaceDir}/${readmeFile}`;
    const checkResult = await executeCommand(instance.id, 'test', ['-f', fullPath], `Checking for ${readmeFile}`);
    if (checkResult) {
      await executeCommand(instance.id, 'cat', [fullPath], `Reading ${readmeFile}`);
      break;
    }
  }

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