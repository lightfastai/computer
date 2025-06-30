import { createLightfastComputer } from '../src/sdk';

/**
 * Example: Using Vercel Sandbox with Git Clone and File Listing
 * 
 * This example demonstrates:
 * 1. Creating a Vercel Sandbox instance with git repository
 * 2. Executing commands (git clone, file listing)
 * 3. Basic file system operations
 * 4. Proper error handling with Result types
 */

async function main() {
  // Initialize the SDK with Vercel provider
  const computer = createLightfastComputer({
    provider: 'vercel',
    vercelToken: process.env.VERCEL_TOKEN || 'your_vercel_token_here',
    projectId: process.env.VERCEL_PROJECT_ID || 'your_project_id',
    teamId: process.env.VERCEL_TEAM_ID, // Optional
    logger: {
      info: console.log,
      error: console.error,
      debug: console.debug,
      warn: console.warn,
    },
  });

  console.log('🚀 Starting Vercel Sandbox example...\n');

  try {
    // Step 1: Create a new sandbox instance with a git repository
    console.log('📦 Creating Vercel Sandbox with git repository...');
    const createResult = await computer.instances.create({
      name: 'vercel-sandbox-example',
      region: 'iad1', // Vercel Sandbox only supports iad1 currently
      size: 'medium', // This will be mapped to 2 vCPUs
      repoUrl: 'https://github.com/vercel/next.js.git',
    });

    if (createResult.isErr()) {
      console.error('❌ Failed to create sandbox:', createResult.error.message);
      return;
    }

    const instance = createResult.value;
    console.log(`✅ Created sandbox: ${instance.id}`);
    console.log(`   Name: ${instance.name}`);
    console.log(`   State: ${instance.state}`);
    console.log(`   Region: ${instance.region}`);
    if (instance.private_ip) {
      console.log(`   Domain: ${instance.private_ip}`);
    }
    console.log();

    // Step 2: List all instances
    console.log('📋 Listing all sandbox instances...');
    const listResult = await computer.instances.list();
    
    if (listResult.isOk()) {
      console.log(`Found ${listResult.value.length} instance(s):`);
      listResult.value.forEach((inst, index) => {
        console.log(`  ${index + 1}. ${inst.name} (${inst.id}) - ${inst.state}`);
      });
    }
    console.log();

    // Step 3: Verify the repository was cloned (it should be in /workspace)
    console.log('🔍 Checking if repository was cloned...');
    const lsResult = await computer.commands.execute(instance.id, {
      command: 'ls -la /workspace',
    });

    if (lsResult.isOk()) {
      console.log('📁 Repository contents:');
      console.log(lsResult.value.stdout);
    } else {
      console.log('⚠️  Repository not found, cloning manually...');
      
      // Clone the repository manually
      const cloneResult = await computer.commands.execute(instance.id, {
        command: 'git clone https://github.com/vercel/next.js.git /workspace/nextjs',
        timeout: 60000, // 60 seconds timeout
      });

      if (cloneResult.isOk()) {
        console.log('✅ Repository cloned successfully');
        console.log(cloneResult.value.stdout);
      } else {
        console.error('❌ Failed to clone repository:', cloneResult.error.message);
      }
    }
    console.log();

    // Step 4: Explore the file structure
    console.log('📂 Exploring the cloned repository structure...');
    const treeResult = await computer.commands.execute(instance.id, {
      command: 'find /workspace -maxdepth 3 -type f -name "*.json" | head -10',
    });

    if (treeResult.isOk()) {
      console.log('🔍 Found JSON files:');
      console.log(treeResult.value.stdout);
    }
    console.log();

    // Step 5: Check Node.js and npm availability
    console.log('🔧 Checking development environment...');
    const envChecks = [
      { name: 'Node.js version', command: 'node --version' },
      { name: 'npm version', command: 'npm --version' },
      { name: 'Git version', command: 'git --version' },
      { name: 'Current working directory', command: 'pwd' },
      { name: 'Available disk space', command: 'df -h /' },
    ];

    for (const check of envChecks) {
      const result = await computer.commands.execute(instance.id, {
        command: check.command,
      });

      if (result.isOk()) {
        console.log(`✅ ${check.name}: ${result.value.stdout.trim()}`);
      } else {
        console.log(`❌ ${check.name}: ${result.error.message}`);
      }
    }
    console.log();

    // Step 6: Try to install dependencies (if package.json exists)
    console.log('📦 Attempting to install dependencies...');
    const packageJsonCheck = await computer.commands.execute(instance.id, {
      command: 'test -f /workspace/package.json && echo "package.json found" || echo "no package.json"',
    });

    if (packageJsonCheck.isOk() && packageJsonCheck.value.stdout.includes('package.json found')) {
      console.log('📄 Found package.json, installing dependencies...');
      
      const npmInstallResult = await computer.commands.execute(instance.id, {
        command: 'cd /workspace && npm install --production',
        timeout: 120000, // 2 minutes timeout
      });

      if (npmInstallResult.isOk()) {
        console.log('✅ Dependencies installed successfully');
        if (npmInstallResult.value.stdout) {
          console.log('Output:', npmInstallResult.value.stdout.substring(0, 500) + '...');
        }
      } else {
        console.log('⚠️  Failed to install dependencies:', npmInstallResult.error.message);
      }
    } else {
      console.log('📄 No package.json found in repository root');
    }
    console.log();

    // Step 7: Create a simple test file
    console.log('📝 Creating a test file...');
    const createFileResult = await computer.commands.execute(instance.id, {
      command: 'echo "Hello from Vercel Sandbox! Generated at $(date)" > /workspace/test-file.txt',
    });

    if (createFileResult.isOk()) {
      console.log('✅ Test file created');
      
      // Read the file back
      const readFileResult = await computer.commands.execute(instance.id, {
        command: 'cat /workspace/test-file.txt',
      });

      if (readFileResult.isOk()) {
        console.log('📄 File contents:', readFileResult.value.stdout.trim());
      }
    }
    console.log();

    // Step 8: Get instance information again
    console.log('ℹ️  Final instance information...');
    const getResult = await computer.instances.get(instance.id);
    
    if (getResult.isOk()) {
      const updatedInstance = getResult.value;
      console.log(`Instance ID: ${updatedInstance.id}`);
      console.log(`Name: ${updatedInstance.name}`);
      console.log(`State: ${updatedInstance.state}`);
      console.log(`Created: ${updatedInstance.created_at}`);
      console.log(`Updated: ${updatedInstance.updated_at}`);
    }
    console.log();

    // Step 9: Clean up - destroy the instance
    console.log('🧹 Cleaning up - destroying the sandbox...');
    const destroyResult = await computer.instances.destroy(instance.id);
    
    if (destroyResult.isOk()) {
      console.log('✅ Sandbox destroyed successfully');
    } else {
      console.error('❌ Failed to destroy sandbox:', destroyResult.error.message);
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }

  console.log('\n🎉 Vercel Sandbox example completed!');
}

// Configuration validation
function validateConfiguration() {
  const requiredEnvVars = ['VERCEL_TOKEN'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these variables and try again.');
    console.error('Example:');
    console.error('   export VERCEL_TOKEN="your_vercel_token"');
    console.error('   export VERCEL_PROJECT_ID="your_project_id"');
    console.error('   export VERCEL_TEAM_ID="your_team_id"  # optional');
    return false;
  }
  
  return true;
}

// Run the example
if (require.main === module) {
  if (validateConfiguration()) {
    main().catch(console.error);
  } else {
    process.exit(1);
  }
}

export { main as runVercelExample };