import { describe, expect, it, spyOn } from 'bun:test';
import { createLogger } from '@/lib/logger';

describe('logger configuration', () => {
  it('should detect test environment', () => {
    // When running tests, process.argv should contain test file paths
    const hasTestFile = process.argv.some((arg) => arg.includes('.test.') || arg.includes('/tests/'));
    expect(hasTestFile).toBe(true);
  });

  it('should be silent during tests', () => {
    // Create a logger instance using our factory
    const logger = createLogger();

    // In test environment, logger should be silent
    expect(logger.level).toBe('silent');
  });

  it('should not output logs during test execution', () => {
    // Spy on process.stdout.write since pino writes directly to stdout
    const stdoutSpy = spyOn(process.stdout, 'write');

    // Create logger and try to log
    const logger = createLogger();
    logger.info('This should not appear');
    logger.error('This should not appear');
    logger.warn('This should not appear');

    // Verify no stdout output (pino writes to stdout, not console)
    expect(stdoutSpy).not.toHaveBeenCalled();

    // Restore spy
    stdoutSpy.mockRestore();
  });
});
