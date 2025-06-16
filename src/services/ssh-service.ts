import { createReadStream, createWriteStream, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { config } from '@/lib/config';
import { AppError } from '@/lib/error-handler';
import pino from 'pino';
import { Client, type ConnectConfig } from 'ssh2';

const log = pino();

export interface SSHConnectionOptions {
  host: string;
  port?: number;
  username?: string;
  privateKey?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// Store for active SSH connections
const connections = new Map<string, Client>();

// Load default private key
const loadDefaultPrivateKey = (): string => {
  try {
    const keyPath = config.sshKeyPath.replace('~', homedir());
    return readFileSync(keyPath, 'utf8');
  } catch (error) {
    throw new AppError(
      `Failed to load SSH private key from ${config.sshKeyPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

// Connect to an instance via SSH
export const connect = async (instanceId: string, options: SSHConnectionOptions): Promise<void> => {
  // Disconnect existing connection if any
  disconnect(instanceId);

  const connectionConfig: ConnectConfig = {
    host: options.host,
    port: options.port || 22,
    username: options.username || 'root',
    privateKey: options.privateKey || loadDefaultPrivateKey(),
    readyTimeout: 30000,
    keepaliveInterval: 10000,
  };

  return new Promise((resolve, reject) => {
    const client = new Client();

    client.on('ready', () => {
      log.info(`SSH connection established for instance ${instanceId}`);
      connections.set(instanceId, client);
      resolve();
    });

    client.on('error', (err) => {
      log.error(`SSH connection error for instance ${instanceId}:`, err);
      reject(new AppError(`SSH connection failed: ${err.message}`));
    });

    client.on('close', () => {
      log.info(`SSH connection closed for instance ${instanceId}`);
      connections.delete(instanceId);
    });

    client.connect(connectionConfig);
  });
};

// Execute a command on the instance
export const executeCommand = async (
  instanceId: string,
  command: string,
  options?: { timeout?: number },
): Promise<CommandResult> => {
  const client = connections.get(instanceId);

  if (!client) {
    throw new AppError(`No SSH connection for instance ${instanceId}`);
  }

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let timeoutHandle: NodeJS.Timeout | null = null;

    client.exec(command, (err, stream) => {
      if (err) {
        reject(new AppError(`Failed to execute command: ${err.message}`));
        return;
      }

      // Set up timeout if specified
      if (options?.timeout) {
        timeoutHandle = setTimeout(() => {
          stream.end();
          reject(new AppError(`Command execution timeout after ${options.timeout}ms`));
        }, options.timeout);
      }

      stream.on('close', (exitCode: number) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: exitCode || 0,
        });
      });

      stream.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      stream.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    });
  });
};

// Create an interactive shell session
export const createShellSession = async (instanceId: string): Promise<NodeJS.ReadWriteStream> => {
  const client = connections.get(instanceId);

  if (!client) {
    throw new AppError(`No SSH connection for instance ${instanceId}`);
  }

  return new Promise((resolve, reject) => {
    client.shell((err, stream) => {
      if (err) {
        reject(new AppError(`Failed to create shell session: ${err.message}`));
        return;
      }

      log.info(`Shell session created for instance ${instanceId}`);
      resolve(stream);
    });
  });
};

// Upload a file to the instance
export const uploadFile = async (instanceId: string, localPath: string, remotePath: string): Promise<void> => {
  const client = connections.get(instanceId);

  if (!client) {
    throw new AppError(`No SSH connection for instance ${instanceId}`);
  }

  return new Promise((resolve, reject) => {
    client.sftp((err, sftp) => {
      if (err) {
        reject(new AppError(`Failed to create SFTP session: ${err.message}`));
        return;
      }

      const readStream = createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);

      writeStream.on('error', (err: Error) => {
        reject(new AppError(`Failed to upload file: ${err.message}`));
      });

      writeStream.on('close', () => {
        log.info(`File uploaded: ${localPath} -> ${remotePath}`);
        sftp.end();
        resolve();
      });

      readStream.pipe(writeStream);
    });
  });
};

// Download a file from the instance
export const downloadFile = async (instanceId: string, remotePath: string, localPath: string): Promise<void> => {
  const client = connections.get(instanceId);

  if (!client) {
    throw new AppError(`No SSH connection for instance ${instanceId}`);
  }

  return new Promise((resolve, reject) => {
    client.sftp((err, sftp) => {
      if (err) {
        reject(new AppError(`Failed to create SFTP session: ${err.message}`));
        return;
      }

      const readStream = sftp.createReadStream(remotePath);
      const writeStream = createWriteStream(localPath);

      readStream.on('error', (err: Error) => {
        reject(new AppError(`Failed to download file: ${err.message}`));
      });

      writeStream.on('error', (err: Error) => {
        reject(new AppError(`Failed to write file: ${err.message}`));
      });

      writeStream.on('close', () => {
        log.info(`File downloaded: ${remotePath} -> ${localPath}`);
        sftp.end();
        resolve();
      });

      readStream.pipe(writeStream);
    });
  });
};

// Disconnect from an instance
export const disconnect = (instanceId: string): void => {
  const client = connections.get(instanceId);

  if (client) {
    client.end();
    connections.delete(instanceId);
    log.info(`SSH connection closed for instance ${instanceId}`);
  }
};

// Disconnect from all instances
export const disconnectAll = (): void => {
  log.info('Closing all SSH connections...');

  for (const [, client] of connections) {
    client.end();
  }

  connections.clear();
};

// Get active connections count
export const getActiveConnectionsCount = (): number => {
  return connections.size;
};

// Check if connected to an instance
export const isConnected = (instanceId: string): boolean => {
  return connections.has(instanceId);
};
