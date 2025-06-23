import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { createConsoleLogger } from '@/lib/console-logger';
import type { Logger } from '@/types/logger';

describe('ConsoleLoggerAdapter', () => {
  let logger: Logger;
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('createConsoleLogger factory', () => {
    it('should create logger with default config', () => {
      logger = createConsoleLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(logger.level).toBe('info');
    });

    it('should create logger with custom level', () => {
      logger = createConsoleLogger({ level: 'debug' });

      expect(logger).toBeDefined();
      expect(logger.level).toBe('debug');
    });

    it('should create silent logger when silent flag is true', () => {
      logger = createConsoleLogger({ silent: true });

      expect(logger).toBeDefined();
      expect(logger.level).toBe('silent');
    });

    it('should prioritize silent over level config', () => {
      logger = createConsoleLogger({ level: 'debug', silent: true });

      expect(logger).toBeDefined();
      expect(logger.level).toBe('silent');
    });
  });

  describe('logging methods', () => {
    beforeEach(() => {
      logger = createConsoleLogger({ level: 'debug' });
    });

    describe('info method', () => {
      it('should log simple message with level prefix', () => {
        logger.info('Test message');

        expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Test message');
      });

      it('should log message with structured data as JSON', () => {
        const data = { key: 'value', count: 42 };
        logger.info('Test message', data);

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const loggedCall = consoleSpy.mock.calls[0][0];
        const parsed = JSON.parse(loggedCall);

        expect(parsed.level).toBe('info');
        expect(parsed.msg).toBe('Test message');
        expect(parsed.key).toBe('value');
        expect(parsed.count).toBe(42);
        expect(parsed.time).toBeDefined();
      });

      it('should log message with multiple arguments', () => {
        logger.info('Test message', 'arg1', 'arg2');

        expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Test message', 'arg1', 'arg2');
      });
    });

    describe('error method', () => {
      it('should log simple error message', () => {
        logger.error('Error message');

        expect(consoleSpy).toHaveBeenCalledWith('[ERROR]', 'Error message');
      });

      it('should log error with structured data', () => {
        const errorData = { status: 500, error: 'Internal Error' };
        logger.error('Error message', errorData);

        const loggedCall = consoleSpy.mock.calls[0][0];
        const parsed = JSON.parse(loggedCall);

        expect(parsed.level).toBe('error');
        expect(parsed.msg).toBe('Error message');
        expect(parsed.status).toBe(500);
        expect(parsed.error).toBe('Internal Error');
      });
    });

    describe('debug method', () => {
      it('should log simple debug message', () => {
        logger.debug('Debug message');

        expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'Debug message');
      });

      it('should log debug with structured data', () => {
        const debugData = { state: 'running' };
        logger.debug('Debug message', debugData);

        const loggedCall = consoleSpy.mock.calls[0][0];
        const parsed = JSON.parse(loggedCall);

        expect(parsed.level).toBe('debug');
        expect(parsed.msg).toBe('Debug message');
        expect(parsed.state).toBe('running');
      });
    });

    describe('warn method', () => {
      it('should log simple warning message', () => {
        logger.warn('Warning message');

        expect(consoleSpy).toHaveBeenCalledWith('[WARN]', 'Warning message');
      });

      it('should log warning with structured data', () => {
        const warnData = { deprecation: true };
        logger.warn('Warning message', warnData);

        const loggedCall = consoleSpy.mock.calls[0][0];
        const parsed = JSON.parse(loggedCall);

        expect(parsed.level).toBe('warn');
        expect(parsed.msg).toBe('Warning message');
        expect(parsed.deprecation).toBe(true);
      });
    });
  });

  describe('log level filtering', () => {
    it('should respect info level filtering', () => {
      logger = createConsoleLogger({ level: 'info' });

      logger.debug('Should not log');
      logger.info('Should log');
      logger.warn('Should log');
      logger.error('Should log');

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      expect(consoleSpy).not.toHaveBeenCalledWith('[DEBUG]', 'Should not log');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Should log');
    });

    it('should respect error level filtering', () => {
      logger = createConsoleLogger({ level: 'error' });

      logger.debug('Should not log');
      logger.info('Should not log');
      logger.warn('Should not log');
      logger.error('Should log');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[ERROR]', 'Should log');
    });

    it('should respect silent level filtering', () => {
      logger = createConsoleLogger({ silent: true });

      logger.debug('Should not log');
      logger.info('Should not log');
      logger.warn('Should not log');
      logger.error('Should not log');

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('level property', () => {
    it('should have info level by default', () => {
      logger = createConsoleLogger();
      expect(logger.level).toBe('info');
    });

    it('should respect custom level', () => {
      logger = createConsoleLogger({ level: 'debug' });
      expect(logger.level).toBe('debug');
    });

    it('should return silent when silent flag is true', () => {
      logger = createConsoleLogger({ silent: true });
      expect(logger.level).toBe('silent');
    });
  });
});
