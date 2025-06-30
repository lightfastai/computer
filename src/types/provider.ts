import type { Result } from 'neverthrow';
import type { AppError } from '@/lib/error-handler';
import type { Logger } from '@/types/logger';

export type ProviderType = 'fly' | 'vercel';

export type FlyProviderConfig = {
  provider: 'fly';
  flyApiToken: string;
  appName: string;
  logger?: Logger;
};

export type VercelProviderConfig = {
  provider: 'vercel';
  vercelToken: string;
  projectId?: string;
  teamId?: string;
  logger?: Logger;
};

export type ProviderConfig = FlyProviderConfig | VercelProviderConfig;

export const isFlyConfig = (config: ProviderConfig): config is FlyProviderConfig => {
  return config.provider === 'fly';
};

export const isVercelConfig = (config: ProviderConfig): config is VercelProviderConfig => {
  return config.provider === 'vercel';
};

export type Machine = {
  id: string;
  name: string;
  state: string;
  region: string;
  created_at: string;
  updated_at: string;
  image?: string;
  size?: string;
  private_ip?: string;
};

export type CreateMachineOptions = {
  name: string;
  region: string;
  size?: string;
  image?: string;
  githubToken?: string;
  githubUsername?: string;
  repoUrl?: string;
  metadata?: Record<string, string>;
};

export type CommandOptions = {
  command: string;
  timeout?: number;
};

export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export interface ComputeProvider {
  createMachine(options: CreateMachineOptions): Promise<Result<Machine, AppError>>;
  getMachine(machineId: string): Promise<Result<Machine, AppError>>;
  listMachines(): Promise<Result<Machine[], AppError>>;
  startMachine(machineId: string): Promise<Result<Machine, AppError>>;
  stopMachine(machineId: string): Promise<Result<Machine, AppError>>;
  destroyMachine(machineId: string): Promise<Result<void, AppError>>;
  executeCommand(machineId: string, command: CommandOptions): Promise<Result<CommandResult, AppError>>;
}
