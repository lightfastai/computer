/**
 * Example usage of the Blender adapter
 */
import {
  connectBlender,
  createBlenderAgent,
  disconnectBlender,
  executeCode,
  getBlenderConnectionState,
  getSceneInfo,
  sendBlenderMessage,
} from '../adapters/blender-adapter';

/**
 * Example of connecting to Blender and getting scene information
 */
export const exampleGetSceneInfo = async () => {
  try {
    // Create a Blender agent
    const agent = createBlenderAgent('MyBlenderAgent');

    // Connect to Blender
    const connectedAgent = await connectBlender(agent);
    console.log(`Connected to Blender: ${connectedAgent.status}`);

    // Get the Blender connection state
    const state = getBlenderConnectionState();

    // Get scene information
    const sceneInfo = await getSceneInfo(state);
    console.log('Scene information:', sceneInfo);

    // Disconnect from Blender
    await disconnectBlender(connectedAgent);
    console.log(`Disconnected from Blender: ${connectedAgent.status}`);

    return sceneInfo;
  } catch (error) {
    console.error('Error getting scene info:', error);
    throw error;
  }
};

/**
 * Example of executing Python code in Blender
 */
export const exampleExecuteCode = async (code: string) => {
  try {
    // Create a Blender agent
    const agent = createBlenderAgent('MyBlenderAgent');

    // Connect to Blender
    const connectedAgent = await connectBlender(agent);
    console.log(`Connected to Blender: ${connectedAgent.status}`);

    // Get the Blender connection state
    const state = getBlenderConnectionState();

    // Execute Python code
    const result = await executeCode(state, code);
    console.log('Code execution result:', result);

    // Disconnect from Blender
    await disconnectBlender(connectedAgent);
    console.log(`Disconnected from Blender: ${connectedAgent.status}`);

    return result;
  } catch (error) {
    console.error('Error executing code:', error);
    throw error;
  }
};

/**
 * Example of sending a custom message to Blender
 */
export const exampleCustomMessage = async (
  commandType: string,
  params: Record<string, unknown> = {},
) => {
  try {
    // Create a Blender agent
    const agent = createBlenderAgent('MyBlenderAgent');

    // Connect to Blender
    const connectedAgent = await connectBlender(agent);
    console.log(`Connected to Blender: ${connectedAgent.status}`);

    // Create a command message
    const command = {
      type: commandType,
      params: params,
    };

    // Send the message to Blender
    const message = await sendBlenderMessage(connectedAgent, JSON.stringify(command));
    console.log('Message response:', message);

    // Disconnect from Blender
    await disconnectBlender(connectedAgent);
    console.log(`Disconnected from Blender: ${connectedAgent.status}`);

    return message;
  } catch (error) {
    console.error('Error sending custom message:', error);
    throw error;
  }
};

// Example usage
if (require.main === module) {
  // Run the examples
  (async () => {
    try {
      console.log('Running Blender adapter examples...');

      // Example 1: Get scene info
      console.log('\nExample 1: Get scene info');
      await exampleGetSceneInfo();

      // Example 2: Execute code
      console.log('\nExample 2: Execute code');
      await exampleExecuteCode('print("Hello from Blender!")');

      // Example 3: Custom message
      console.log('\nExample 3: Custom message');
      await exampleCustomMessage('get_scene_info');

      console.log('\nAll examples completed successfully!');
    } catch (error) {
      console.error('Error running examples:', error);
    }
  })();
}
