import { Client, ConnectConfig } from 'ssh2';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import pino from 'pino';
import { config } from '../lib/config';
import { AppError } from '../lib/error-handler';

const log = pino();

export interface SSHConnectionOptions {
  host: string;
  port?: number;
  username?: string;
  privateKey?: string;
  timeout?: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class SSHService {
  private connections: Map<string, Client> = new Map();

  async connect(instanceId: string, options: SSHConnectionOptions): Promise<void> {
    if (this.connections.has(instanceId)) {
      log.debug(`Reusing existing SSH connection for instance ${instanceId}`);
      return;
    }

    const client = new Client();
    const privateKey = options.privateKey || this.loadDefaultPrivateKey();

    const connectionConfig: ConnectConfig = {
      host: options.host,
      port: options.port || 22,
      username: options.username || 'root',
      privateKey,
      timeout: options.timeout || config.sshTimeout,
      readyTimeout: options.timeout || config.sshTimeout,
    };

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        log.info(`SSH connection established for instance ${instanceId}`);
        this.connections.set(instanceId, client);
        resolve();
      });

      client.on('error', (err) => {
        log.error(`SSH connection error for instance ${instanceId}:`, err);
        this.connections.delete(instanceId);
        reject(new AppError(`SSH connection failed: ${err.message}`));
      });

      client.on('close', () => {
        log.info(`SSH connection closed for instance ${instanceId}`);
        this.connections.delete(instanceId);
      });

      client.connect(connectionConfig);
    });
  }

  async executeCommand(
    instanceId: string,
    command: string,
    options?: { timeout?: number }
  ): Promise<CommandResult> {
    const client = this.connections.get(instanceId);
    
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

        // Set command timeout if specified
        if (options?.timeout) {
          timeoutHandle = setTimeout(() => {
            stream.destroy();
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
  }

  async createShellSession(instanceId: string): Promise<NodeJS.ReadWriteStream> {
    const client = this.connections.get(instanceId);
    
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
  }

  async uploadFile(
    instanceId: string,
    localPath: string,
    remotePath: string
  ): Promise<void> {
    const client = this.connections.get(instanceId);
    
    if (!client) {
      throw new AppError(`No SSH connection for instance ${instanceId}`);
    }

    return new Promise((resolve, reject) => {
      client.sftp((err, sftp) => {
        if (err) {
          reject(new AppError(`Failed to create SFTP session: ${err.message}`));
          return;
        }

        const readStream = readFileSync(localPath);
        const writeStream = sftp.createWriteStream(remotePath);

        writeStream.on('error', (err) => {
          reject(new AppError(`Failed to upload file: ${err.message}`));
        });

        writeStream.on('close', () => {
          log.info(`File uploaded to ${remotePath} on instance ${instanceId}`);
          sftp.end();
          resolve();
        });

        writeStream.end(readStream);
      });
    });
  }

  async downloadFile(
    instanceId: string,
    remotePath: string,
    localPath: string
  ): Promise<void> {
    const client = this.connections.get(instanceId);
    
    if (!client) {
      throw new AppError(`No SSH connection for instance ${instanceId}`);
    }

    return new Promise((resolve, reject) => {
      client.sftp((err, sftp) => {
        if (err) {
          reject(new AppError(`Failed to create SFTP session: ${err.message}`));
          return;
        }

        sftp.fastGet(remotePath, localPath, (err) => {
          if (err) {
            reject(new AppError(`Failed to download file: ${err.message}`));
            return;
          }

          log.info(`File downloaded from ${remotePath} on instance ${instanceId}`);
          sftp.end();
          resolve();
        });
      });
    });
  }

  disconnect(instanceId: string): void {
    const client = this.connections.get(instanceId);
    
    if (client) {
      client.end();
      this.connections.delete(instanceId);
      log.info(`SSH connection closed for instance ${instanceId}`);
    }
  }

  disconnectAll(): void {
    for (const [instanceId, client] of this.connections) {
      client.end();
      log.info(`SSH connection closed for instance ${instanceId}`);
    }
    this.connections.clear();
  }

  private loadDefaultPrivateKey(): string {
    try {
      const keyPath = config.sshKeyPath.replace('~', homedir());
      return readFileSync(keyPath, 'utf8');
    } catch (error) {
      throw new AppError(
        `Failed to load SSH private key from ${config.sshKeyPath}: ${error.message}`
      );
    }
  }
}