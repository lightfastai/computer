import { beforeEach, describe, expect, it } from 'bun:test';
import { createPinoLogger } from '@/lib/pino-logger';
import type { Logger } from '@/types/logger';

describe('PinoLoggerAdapter', () => {
  let logger: Logger;

  describe('createPinoLogger factory', () => {
    it('should create logger with default config', () => {
      logger = createPinoLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.level).toBe('string');
    });

    it('should create logger with custom level', () => {
      logger = createPinoLogger({ level: 'debug' });

      expect(logger).toBeDefined();
      expect(logger.level).toBe('debug');
    });

    it('should create silent logger when silent flag is true', () => {
      logger = createPinoLogger({ silent: true });

      expect(logger).toBeDefined();
      expect(logger.level).toBe('silent');
    });

    it('should prioritize silent over level config', () => {
      logger = createPinoLogger({ level: 'debug', silent: true });

      expect(logger).toBeDefined();
      expect(logger.level).toBe('silent');
    });
  });

  describe('logging methods', () => {
    beforeEach(() => {
      logger = createPinoLogger({ silent: true }); // Silent for testing
    });

    describe('info method', () => {
      it('should call info method without throwing', () => {
        expect(() => logger.info('Test message')).not.toThrow();
      });

      it('should handle object data', () => {
        const data = { key: 'value' };
        expect(() => logger.info('Test message', data)).not.toThrow();
      });

      it('should handle multiple arguments', () => {
        expect(() => logger.info('Test message', 'arg1', 'arg2')).not.toThrow();
      });
    });

    describe('error method', () => {
      it('should call error method without throwing', () => {
        expect(() => logger.error('Error message')).not.toThrow();
      });

      it('should handle object data', () => {
        const errorData = { status: 500, error: 'Internal Error' };
        expect(() => logger.error('Error message', errorData)).not.toThrow();
      });
    });

    describe('debug method', () => {
      it('should call debug method without throwing', () => {
        expect(() => logger.debug('Debug message')).not.toThrow();
      });

      it('should handle object data', () => {
        const debugData = { state: 'running' };
        expect(() => logger.debug('Debug message', debugData)).not.toThrow();
      });
    });

    describe('warn method', () => {
      it('should call warn method without throwing', () => {
        expect(() => logger.warn('Warning message')).not.toThrow();
      });

      it('should handle object data', () => {
        const warnData = { deprecation: true };
        expect(() => logger.warn('Warning message', warnData)).not.toThrow();
      });
    });
  });

  describe('level property', () => {
    it('should have info level by default', () => {
      logger = createPinoLogger();
      expect(logger.level).toBe('info');
    });

    it('should respect custom level', () => {
      logger = createPinoLogger({ level: 'debug' });
      expect(logger.level).toBe('debug');
    });
  });
});
