import type { Logger, LoggerConfig, LoggerFactory } from '@/types/logger';

const LOG_LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

class ConsoleLoggerAdapter implements Logger {
  private readonly levelNumber: number;

  constructor(private config: LoggerConfig = {}) {
    const level = config.silent ? 'silent' : config.level || 'info';
    this.levelNumber = LOG_LEVELS[level as LogLevel] ?? LOG_LEVELS.info;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelNumber >= LOG_LEVELS[level];
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      // Structured logging: message with context object
      const context = args[0] as Record<string, unknown>;
      const timestamp = new Date().toISOString();
      const logEntry = {
        level,
        time: timestamp,
        msg: message,
        ...context,
      };
      console.log(JSON.stringify(logEntry));
    } else if (args.length > 0) {
      // Multiple arguments
      console.log(`[${level.toUpperCase()}]`, message, ...args);
    } else {
      // Simple message
      console.log(`[${level.toUpperCase()}]`, message);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      this.formatMessage('info', message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      this.formatMessage('error', message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      this.formatMessage('debug', message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      this.formatMessage('warn', message, ...args);
    }
  }

  get level(): string {
    return this.config.silent ? 'silent' : this.config.level || 'info';
  }
}

export const createConsoleLogger: LoggerFactory = (config?: LoggerConfig): Logger => {
  return new ConsoleLoggerAdapter(config);
};
