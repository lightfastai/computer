import pino from 'pino';

// Detect if we're running in a test environment
// Check multiple indicators since different test runners set different vars
const isTestEnvironment =
  process.env.NODE_ENV === 'test' || process.argv.some((arg) => arg.includes('.test.') || arg.includes('/tests/'));

// Create logger with appropriate configuration
export const createLogger = () => {
  return pino({
    level: isTestEnvironment ? 'silent' : process.env.LOG_LEVEL || 'info',
  });
};

// Export a default logger instance
export const logger = createLogger();
