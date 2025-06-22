// Test helper for proper mock cleanup between tests
export const cleanupAllMocks = () => {
  // Clear all module cache to ensure fresh imports
  if (typeof require !== 'undefined' && require.cache) {
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/src/') || key.includes('/tests/')) {
        delete require.cache[key];
      }
    });
  }
  
  // Reset module registry if available
  if (typeof Bun !== 'undefined' && Bun.transpiler) {
    // Force module re-evaluation
    const moduleKeys = Object.keys(globalThis).filter(key => 
      key.startsWith('__') && key.includes('module')
    );
    moduleKeys.forEach(key => {
      delete (globalThis as any)[key];
    });
  }
};