#!/usr/bin/env bun

/**
 * Basic usage example for the Fly.io Workflow Orchestrator API
 *
 * This example demonstrates:
 * 1. Creating an Ubuntu instance
 * 2. Executing commands on the instance
 * 3. Running a workflow
 * 4. Cleaning up resources
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const API_KEY = process.env.API_KEY;

const headers: HeadersInit = {
  'Content-Type': 'application/json',
};

if (API_KEY) {
  headers['Authorization'] = `Bearer ${API_KEY}`;
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  console.log('🚀 Fly.io Workflow Orchestrator - Basic Usage Example\n');

  try {
    // 1. Create an instance
    console.log('1️⃣  Creating Ubuntu instance...');
    const instance = await apiRequest('/instances', {
      method: 'POST',
      body: JSON.stringify({
        name: 'example-instance',
        region: 'iad',
        size: 'shared-cpu-1x',
        memoryMb: 256,
      }),
    });
    console.log(`✅ Instance created: ${instance.id}`);
    console.log(`   Status: ${instance.status}`);
    console.log(`   Region: ${instance.region}\n`);

    // Wait for instance to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 2. Execute commands
    console.log('2️⃣  Executing commands on instance...');

    // Update system
    console.log('   Updating system packages...');
    const updateCmd = await apiRequest(`/instances/${instance.id}/exec`, {
      method: 'POST',
      body: JSON.stringify({
        command: 'apt-get update -qq',
        timeout: 30000,
      }),
    });
    console.log(`   ✅ Update completed (exit code: ${updateCmd.exitCode})`);

    // Install git
    console.log('   Installing git...');
    const gitCmd = await apiRequest(`/instances/${instance.id}/exec`, {
      method: 'POST',
      body: JSON.stringify({
        command: 'apt-get install -y git',
        timeout: 60000,
      }),
    });
    console.log(`   ✅ Git installed (exit code: ${gitCmd.exitCode})`);

    // Check git version
    console.log('   Checking git version...');
    const versionCmd = await apiRequest(`/instances/${instance.id}/exec`, {
      method: 'POST',
      body: JSON.stringify({
        command: 'git --version',
      }),
    });
    console.log(`   ✅ Git version: ${versionCmd.output}\n`);

    // 3. Run a workflow
    console.log('3️⃣  Running a workflow...');
    console.log('   Getting available workflows...');
    const workflows = await apiRequest('/workflows');
    console.log(`   Found ${workflows.length} workflows`);

    if (workflows.length > 0) {
      const workflow = workflows[0];
      console.log(`   Executing workflow: ${workflow.name}`);

      const execution = await apiRequest(`/workflows/${workflow.id}/execute`, {
        method: 'POST',
        body: JSON.stringify({
          context: {
            repoUrl: 'https://github.com/example/repo.git',
          },
        }),
      });

      console.log(`   ✅ Workflow execution started: ${execution.id}`);
      console.log(`   Status: ${execution.status}\n`);

      // Check execution status
      await new Promise(resolve => setTimeout(resolve, 3000));
      const status = await apiRequest(`/workflows/executions/${execution.id}`);
      console.log(`   Execution status: ${status.status}`);
    }

    // 4. Clean up
    console.log('\n4️⃣  Cleaning up...');
    console.log('   Destroying instance...');
    await apiRequest(`/instances/${instance.id}`, {
      method: 'DELETE',
    });
    console.log('   ✅ Instance destroyed');

    console.log('\n✨ Example completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the example
main();
