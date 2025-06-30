import { createLightfastComputer } from '../src/sdk';

/**
 * Vercel Sandbox Git Clone Demo
 * 
 * This focused example demonstrates the core git clone and file listing
 * capabilities of Vercel Sandbox through the Lightfast Computer SDK.
 * 
 * Features demonstrated:
 * - Creating a sandbox with automatic git clone
 * - Manual git clone operations
 * - File system exploration
 * - Directory traversal and file discovery
 */

interface RepoInfo {
  url: string;
  name: string;
  description: string;
}

const DEMO_REPOSITORIES: RepoInfo[] = [
  {
    url: 'https://github.com/vercel/next.js.git',
    name: 'Next.js',
    description: 'The React Framework for the Web',
  },
  {
    url: 'https://github.com/microsoft/vscode.git',
    name: 'VS Code',
    description: 'Visual Studio Code',
  },
  {
    url: 'https://github.com/facebook/react.git',
    name: 'React',
    description: 'A declarative, efficient JavaScript library for building UIs',
  },
];

async function main() {
  console.log('🎯 Vercel Sandbox Git Clone Demo\n');

  const computer = createLightfastComputer({
    provider: 'vercel',
    vercelToken: process.env.VERCEL_TOKEN || 'your_vercel_token_here',
    projectId: process.env.VERCEL_PROJECT_ID,
    teamId: process.env.VERCEL_TEAM_ID,
    logger: {
      info: (...args) => console.log('ℹ️ ', ...args),
      error: (...args) => console.error('❌', ...args),
      debug: (...args) => console.debug('🐛', ...args),
      warn: (...args) => console.warn('⚠️ ', ...args),
    },
  });

  // Demo 1: Create sandbox with automatic git clone
  await demoAutomaticGitClone(computer);
  
  // Demo 2: Manual git operations in sandbox
  await demoManualGitOperations(computer);
  
  console.log('\n🎉 All demos completed successfully!');
}

async function demoAutomaticGitClone(computer: any) {
  console.log('🚀 Demo 1: Automatic Git Clone on Sandbox Creation\n');
  
  const repo = DEMO_REPOSITORIES[0]; // Next.js
  console.log(`📦 Creating sandbox with automatic clone of ${repo.name}...`);
  console.log(`   Repository: ${repo.url}`);
  console.log(`   Description: ${repo.description}\n`);

  const createResult = await computer.instances.create({
    name: `auto-clone-${Date.now()}`,
    region: 'iad1',
    size: 'medium',
    repoUrl: repo.url,
  });

  if (createResult.isErr()) {
    console.error('Failed to create sandbox:', createResult.error.message);
    return;
  }

  const instance = createResult.value;
  console.log(`✅ Sandbox created: ${instance.id}\n`);

  // Explore the automatically cloned repository
  await exploreRepository(computer, instance.id, '/workspace', repo.name);
  
  // Clean up
  console.log('🧹 Cleaning up demo 1 sandbox...');
  await computer.instances.destroy(instance.id);
  console.log('✅ Demo 1 cleanup complete\n');
}

async function demoManualGitOperations(computer: any) {
  console.log('🔧 Demo 2: Manual Git Operations\n');
  
  console.log('📦 Creating empty sandbox...');
  const createResult = await computer.instances.create({
    name: `manual-git-${Date.now()}`,
    region: 'iad1',
    size: 'large', // 4 vCPUs for faster operations
  });

  if (createResult.isErr()) {
    console.error('Failed to create sandbox:', createResult.error.message);
    return;
  }

  const instance = createResult.value;
  console.log(`✅ Sandbox created: ${instance.id}\n`);

  // Clone multiple repositories manually
  for (let i = 0; i < DEMO_REPOSITORIES.length; i++) {
    const repo = DEMO_REPOSITORIES[i];
    const repoDir = `/workspace/repo-${i + 1}-${repo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    console.log(`📥 Cloning ${repo.name} to ${repoDir}...`);
    
    const cloneResult = await computer.commands.execute(instance.id, {
      command: `git clone --depth 1 ${repo.url} ${repoDir}`,
      timeout: 60000,
    });

    if (cloneResult.isOk()) {
      console.log(`✅ Successfully cloned ${repo.name}`);
      
      // Quick exploration of this repository
      await exploreRepository(computer, instance.id, repoDir, repo.name, true);
    } else {
      console.log(`❌ Failed to clone ${repo.name}:`, cloneResult.error.message);
    }
    console.log();
  }

  // Show overall workspace structure
  console.log('📂 Final workspace structure:');
  const treeResult = await computer.commands.execute(instance.id, {
    command: 'find /workspace -maxdepth 2 -type d | sort',
  });

  if (treeResult.isOk()) {
    console.log(treeResult.value.stdout);
  }

  // Clean up
  console.log('🧹 Cleaning up demo 2 sandbox...');
  await computer.instances.destroy(instance.id);
  console.log('✅ Demo 2 cleanup complete\n');
}

async function exploreRepository(
  computer: any,
  instanceId: string,
  repoPath: string,
  repoName: string,
  brief = false
) {
  console.log(`🔍 Exploring ${repoName} repository...`);

  // Check if the repository exists
  const checkResult = await computer.commands.execute(instanceId, {
    command: `test -d ${repoPath} && echo "exists" || echo "not found"`,
  });

  if (checkResult.isErr() || !checkResult.value.stdout.includes('exists')) {
    console.log(`⚠️  Repository not found at ${repoPath}`);
    return;
  }

  if (brief) {
    // Brief exploration for demo 2
    const fileCountResult = await computer.commands.execute(instanceId, {
      command: `find ${repoPath} -type f | wc -l`,
    });

    if (fileCountResult.isOk()) {
      const fileCount = fileCountResult.value.stdout.trim();
      console.log(`   📄 Files: ${fileCount}`);
    }

    const packageJsonResult = await computer.commands.execute(instanceId, {
      command: `test -f ${repoPath}/package.json && echo "✅ package.json" || echo "❌ no package.json"`,
    });

    if (packageJsonResult.isOk()) {
      console.log(`   ${packageJsonResult.value.stdout.trim()}`);
    }
    return;
  }

  // Detailed exploration for demo 1
  const explorationCommands = [
    {
      name: 'Directory listing',
      command: `ls -la ${repoPath}`,
      showOutput: true,
    },
    {
      name: 'File count',
      command: `find ${repoPath} -type f | wc -l`,
      showOutput: true,
    },
    {
      name: 'Directory count',
      command: `find ${repoPath} -type d | wc -l`,
      showOutput: true,
    },
    {
      name: 'Git information',
      command: `cd ${repoPath} && git log --oneline -5`,
      showOutput: true,
    },
    {
      name: 'Package files',
      command: `find ${repoPath} -maxdepth 2 -name "package.json" -o -name "*.toml" -o -name "Cargo.toml" -o -name "requirements.txt" -o -name "Gemfile"`,
      showOutput: true,
    },
    {
      name: 'README files',
      command: `find ${repoPath} -maxdepth 2 -iname "readme*"`,
      showOutput: true,
    },
    {
      name: 'Source code languages',
      command: `find ${repoPath} -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" | head -10`,
      showOutput: true,
    },
  ];

  for (const cmd of explorationCommands) {
    const result = await computer.commands.execute(instanceId, {
      command: cmd.command,
      timeout: 30000,
    });

    if (result.isOk()) {
      console.log(`   📋 ${cmd.name}:`);
      if (cmd.showOutput && result.value.stdout.trim()) {
        const output = result.value.stdout.trim();
        // Limit output length for readability
        const displayOutput = output.length > 500 ? output.substring(0, 500) + '...' : output;
        console.log('      ' + displayOutput.replace(/\n/g, '\n      '));
      } else if (result.value.stdout.trim()) {
        console.log(`      ${result.value.stdout.trim()}`);
      } else {
        console.log('      (no output)');
      }
    } else {
      console.log(`   ❌ ${cmd.name}: ${result.error.message}`);
    }
  }
  console.log();
}

// Validation helper
function validateConfiguration(): boolean {
  if (!process.env.VERCEL_TOKEN) {
    console.error('❌ VERCEL_TOKEN environment variable is required');
    console.error('\nTo get a Vercel token:');
    console.error('1. Go to https://vercel.com/account/tokens');
    console.error('2. Create a new token');
    console.error('3. Set the environment variable:');
    console.error('   export VERCEL_TOKEN="your_token_here"');
    console.error('\nOptional variables:');
    console.error('   export VERCEL_PROJECT_ID="your_project_id"');
    console.error('   export VERCEL_TEAM_ID="your_team_id"');
    return false;
  }
  return true;
}

// Run the demo
if (require.main === module) {
  if (validateConfiguration()) {
    main().catch((error) => {
      console.error('💥 Demo failed:', error);
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
}

export { main as runGitCloneDemo };