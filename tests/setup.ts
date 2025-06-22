import { afterEach, beforeEach } from 'bun:test';
import { InMemoryStorage, setStorage } from '@/lib/storage';
import * as commandService from '@/services/command-service';
import * as instanceService from '@/services/instance-service';

// Global test setup to ensure clean state between ALL tests
beforeEach(() => {
  // Reset to fresh in-memory storage for each test
  const freshStorage = new InMemoryStorage();
  setStorage(freshStorage);

  // Clear service-level state
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
  // Extra cleanup after each test
  instanceService.clearAllInstances();
  commandService.clearAllCommandHistory();
});

// Export a helper to get fresh storage for tests
export const getFreshStorage = () => {
  const storage = new InMemoryStorage();
  setStorage(storage);
  return storage;
};
