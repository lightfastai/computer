import { describe, expect, it } from 'bun:test';
import type { Logger } from '@/types/logger';

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

  it('should support custom logger implementations', () => {
    const customLogger: Logger = {
      info: (message: string) => console.log(`[INFO] ${message}`),
      error: (message: string) => console.error(`[ERROR] ${message}`),
      debug: (message: string) => console.log(`[DEBUG] ${message}`),
      warn: (message: string) => console.warn(`[WARN] ${message}`),
      level: 'debug',
    };

    expect(customLogger.level).toBe('debug');
    expect(typeof customLogger.info).toBe('function');
  });
});
