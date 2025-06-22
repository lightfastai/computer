import { afterEach, beforeEach } from 'bun:test';
import * as commandService from '@/services/command-service';
import * as instanceService from '@/services/instance-service';

// Global test setup to ensure clean state between ALL tests
beforeEach(() => {
  // Clear service-level state (no-op in stateless SDK)
  instanceService.clearAllInstances();
  commandService.clearAllCommandHistory();

  // Clear any module-level state that might exist
  if (typeof global !== 'undefined') {
    // Reset any global test state - properly typed
    interface TestGlobals {
      __testInstances?: Map<string, unknown>;
      __testCommands?: Map<string, unknown>;
    }
    const testGlobal = global as typeof globalThis & TestGlobals;
    testGlobal.__testInstances = new Map();
    testGlobal.__testCommands = new Map();
  }
});

afterEach(() => {
  // Extra cleanup after each test (no-op in stateless SDK)
  instanceService.clearAllInstances();
  commandService.clearAllCommandHistory();
});
