export interface Logger {
  info(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  level: string;
}

export interface LoggerConfig {
  level?: string;
  silent?: boolean;
}

export type LoggerFactory = (config?: LoggerConfig) => Logger;
