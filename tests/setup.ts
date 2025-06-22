import { beforeEach } from 'bun:test';
import { InMemoryStorage, setStorage } from '@/lib/storage';

// Global test setup to ensure clean state between tests
beforeEach(() => {
  // Reset to fresh in-memory storage for each test
  const freshStorage = new InMemoryStorage();
  setStorage(freshStorage);
  
  // Clear any module-level state that might exist
  if (typeof global !== 'undefined') {
    // Reset any global test state
    (global as any).__testInstances = new Map();
    (global as any).__testCommands = new Map();
  }
});

// Export a helper to get fresh storage for tests
export const getFreshStorage = () => {
  const storage = new InMemoryStorage();
  setStorage(storage);
  return storage;
};