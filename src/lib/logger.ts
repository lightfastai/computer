import { createConsoleLogger } from '@/lib/console-logger';
import type { Logger, LoggerConfig, LoggerFactory } from '@/types/logger';

// Detect if we're running in a test environment
// Check multiple indicators since different test runners set different vars
const isTestEnvironment =
  process.env.NODE_ENV === 'test' || process.argv.some((arg) => arg.includes('.test.') || arg.includes('/tests/'));

// Create logger with appropriate configuration
export const createLogger: LoggerFactory = (config?: LoggerConfig): Logger => {
  const loggerConfig: LoggerConfig = {
    level: config?.level || process.env.LOG_LEVEL || 'info',
    silent: config?.silent || isTestEnvironment,
  };

  return createConsoleLogger(loggerConfig);
};

// Export a default logger instance
export const logger = createLogger();
