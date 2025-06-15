export interface Instance {
  id: string;
  flyMachineId: string;
  name: string;
  region: string;
  image: string;
  size: string;
  memoryMb: number;
  ipAddress?: string;
  privateIpAddress?: string;
  status: InstanceStatus;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export enum InstanceStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  STOPPED = 'stopped',
  FAILED = 'failed',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
}

export interface CreateInstanceOptions {
  name?: string;
  region?: string;
  image?: string;
  size?: string;
  memoryMb?: number;
  metadata?: Record<string, any>;
  sshKeyContent?: string;
}

export interface CommandExecution {
  id: string;
  instanceId: string;
  command: string;
  status: CommandStatus;
  output?: string;
  error?: string;
  exitCode?: number;
  startedAt: Date;
  completedAt?: Date;
}

export enum CommandStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  config: Record<string, any>;
  dependsOn?: string[];
}

export enum StepType {
  CREATE_INSTANCE = 'create_instance',
  EXECUTE_COMMAND = 'execute_command',
  WAIT = 'wait',
  DESTROY_INSTANCE = 'destroy_instance',
  CONDITIONAL = 'conditional',
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  context: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}