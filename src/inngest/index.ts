export * from './instance-functions';
export * from './workflow-functions';
export * from './command-functions';

import { createInstance, destroyInstance } from './instance-functions';
import { executeWorkflow } from './workflow-functions';
import { executeCommand, executeLongCommand } from './command-functions';

// Export all functions as an array for registration
export const inngestFunctions = [
  createInstance,
  destroyInstance,
  executeWorkflow,
  executeCommand,
  executeLongCommand,
];