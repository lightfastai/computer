import { describe, expect, it } from 'bun:test';
import type { Logger, LoggerConfig, LoggerFactory } from '@/types/logger';

describe('Logger Interface', () => {
  it('should define logger interface with required methods', () => {
    const mockLogger: Logger = {
      info: () => {},
      error: () => {},
      debug: () => {},
      warn: () => {},
      level: 'info',
    };

    expect(typeof mockLogger.info).toBe('function');
    expect(typeof mockLogger.error).toBe('function');
    expect(typeof mockLogger.debug).toBe('function');
    expect(typeof mockLogger.warn).toBe('function');
    expect(typeof mockLogger.level).toBe('string');
  });

  it('should define logger config interface', () => {
    const config: LoggerConfig = {
      level: 'debug',
      silent: false,
    };

    expect(typeof config.level).toBe('string');
    expect(typeof config.silent).toBe('boolean');
  });

  it('should define logger factory type', () => {
    const factory: LoggerFactory = (config?: LoggerConfig) => ({
      info: () => {},
      error: () => {},
      debug: () => {},
      warn: () => {},
      level: config?.level || 'info',
    });

    const logger = factory({ level: 'debug' });
    expect(logger.level).toBe('debug');
  });

  it('should support optional config in factory', () => {
    const factory: LoggerFactory = (config?: LoggerConfig) => ({
      info: () => {},
      error: () => {},
      debug: () => {},
      warn: () => {},
      level: config?.level || 'info',
    });

    const logger = factory();
    expect(logger.level).toBe('info');
  });
});
