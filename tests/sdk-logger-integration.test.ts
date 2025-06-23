import { describe, expect, it, mock } from 'bun:test';
import { createConsoleLogger, createLightfastComputer } from '@/sdk';
import type { Logger, LoggerConfig } from '@/types/logger';

describe('SDK Logger Integration', () => {
  const TEST_FLY_TOKEN = 'test-fly-token-123';

  describe('Logger interface support', () => {
    it('should accept custom logger implementation', () => {
      const customLogger: Logger = {
        info: mock(),
        error: mock(),
        debug: mock(),
        warn: mock(),
        level: 'debug',
      };

      const computer = createLightfastComputer({
        flyApiToken: TEST_FLY_TOKEN,
        logger: customLogger,
      });

      expect(computer).toBeDefined();
      expect(computer.instances).toBeDefined();
      expect(computer.commands).toBeDefined();
    });

    it('should work with console logger from factory', () => {
      const consoleLogger = createConsoleLogger({ level: 'info' });

      const computer = createLightfastComputer({
        flyApiToken: TEST_FLY_TOKEN,
        logger: consoleLogger,
      });

      expect(computer).toBeDefined();
      expect(consoleLogger.level).toBe('info');
    });

    it('should create default logger when none provided', () => {
      const computer = createLightfastComputer({
        flyApiToken: TEST_FLY_TOKEN,
      });

      expect(computer).toBeDefined();
      expect(computer.instances).toBeDefined();
      expect(computer.commands).toBeDefined();
    });

    it('should handle custom logger with different implementations', () => {
      const logMessages: string[] = [];

      const customLogger: Logger = {
        info: (message: string) => logMessages.push(`INFO: ${message}`),
        error: (message: string) => logMessages.push(`ERROR: ${message}`),
        debug: (message: string) => logMessages.push(`DEBUG: ${message}`),
        warn: (message: string) => logMessages.push(`WARN: ${message}`),
        level: 'debug',
      };

      const computer = createLightfastComputer({
        flyApiToken: TEST_FLY_TOKEN,
        logger: customLogger,
      });

      expect(computer).toBeDefined();

      // Test that the logger interface works
      customLogger.info('Test message');
      customLogger.error('Test error');

      expect(logMessages).toContain('INFO: Test message');
      expect(logMessages).toContain('ERROR: Test error');
    });
  });

  describe('Exported logger types and utilities', () => {
    it('should export Logger interface types', () => {
      // These imports should work from the SDK
      const config: LoggerConfig = {
        level: 'debug',
        silent: false,
      };

      expect(config.level).toBe('debug');
      expect(config.silent).toBe(false);
    });

    it('should export createConsoleLogger utility', () => {
      const logger = createConsoleLogger({ level: 'warn' });

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(logger.level).toBe('warn');
    });

    it('should support logger factory pattern', () => {
      const createCustomLogger = (config?: LoggerConfig): Logger => ({
        info: () => {},
        error: () => {},
        debug: () => {},
        warn: () => {},
        level: config?.level || 'info',
      });

      const logger = createCustomLogger({ level: 'error' });

      expect(logger.level).toBe('error');

      // Should work with SDK
      const computer = createLightfastComputer({
        flyApiToken: TEST_FLY_TOKEN,
        logger,
      });

      expect(computer).toBeDefined();
    });
  });
});
