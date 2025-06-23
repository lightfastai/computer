import pino from 'pino';
import type { Logger, LoggerConfig, LoggerFactory } from '@/types/logger';

class PinoLoggerAdapter implements Logger {
  private pinoInstance: pino.Logger;

  constructor(config: LoggerConfig = {}) {
    this.pinoInstance = pino({
      level: config.silent ? 'silent' : config.level || 'info',
    });
  }

  info(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object') {
      this.pinoInstance.info(args[0], message);
    } else if (args.length > 0) {
      this.pinoInstance.info(message, ...args);
    } else {
      this.pinoInstance.info(message);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object') {
      this.pinoInstance.error(args[0], message);
    } else if (args.length > 0) {
      this.pinoInstance.error(message, ...args);
    } else {
      this.pinoInstance.error(message);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object') {
      this.pinoInstance.debug(args[0], message);
    } else if (args.length > 0) {
      this.pinoInstance.debug(message, ...args);
    } else {
      this.pinoInstance.debug(message);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object') {
      this.pinoInstance.warn(args[0], message);
    } else if (args.length > 0) {
      this.pinoInstance.warn(message, ...args);
    } else {
      this.pinoInstance.warn(message);
    }
  }

  get level(): string {
    return this.pinoInstance.level;
  }
}

export const createPinoLogger: LoggerFactory = (config?: LoggerConfig): Logger => {
  return new PinoLoggerAdapter(config);
};
