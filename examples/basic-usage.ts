import createLightfastComputer from '@lightfast/computer';

// Initialize the SDK
const sdk = createLightfastComputer({ storage: 'memory' });

async function main() {
  // Create an instance
  const createResult = await sdk.instances.create({
    name: 'my-dev-instance',
    region: 'iad',
    size: 'shared-cpu-1x',
    memoryMb: 512,
  });

  if (createResult.isErr()) {
    console.error('Failed to create instance:', createResult.error.message);
    return;
  }

  const instance = createResult.value;
  console.log('Created instance:', instance.id);

  // Execute a command
  const execResult = await sdk.commands.execute({
    instanceId: instance.id,
    command: 'ls',
    args: ['-la'],
  });

  if (execResult.isErr()) {
    console.error('Failed to execute command:', execResult.error.message);
    return;
  }

  console.log('Command output:', execResult.value.output);

  // Get instance stats
  const stats = await sdk.instances.getStats();
  console.log('Instance statistics:', stats);

  // Clean up - destroy the instance
  const destroyResult = await sdk.instances.destroy(instance.id);
  if (destroyResult.isOk()) {
    console.log('Instance destroyed successfully');
  }
}

main().catch(console.error);