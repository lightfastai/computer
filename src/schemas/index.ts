import { z } from 'zod';

// Base schemas
export const MetadataSchema = z.record(z.string(), z.unknown());

// Step config schemas
export const CreateInstanceConfigSchema = z.object({
  size: z.string().optional(),
  memoryMb: z.number().optional(),
  image: z.string().optional(),
  region: z.string().optional(),
  contextKey: z.string().optional(),
});

export const ExecuteCommandConfigSchema = z.object({
  command: z.string(),
  instanceKey: z.string().optional(),
  timeout: z.number().optional(),
  resultKey: z.string().optional(),
  failOnError: z.boolean().optional(),
});

export const WaitConfigSchema = z.object({
  duration: z.number().optional(),
});

export const DestroyInstanceConfigSchema = z.object({
  instanceKey: z.string().optional(),
});

export const ConditionalConfigSchema = z.object({
  contextKey: z.string(),
  condition: z.object({
    operator: z.enum(['equals', 'notEquals', 'contains', 'exists']),
    value: z.unknown().optional(),
  }),
});

export const WorkflowConfigSchema = z.union([
  CreateInstanceConfigSchema,
  ExecuteCommandConfigSchema,
  WaitConfigSchema,
  DestroyInstanceConfigSchema,
  ConditionalConfigSchema,
  z.record(z.string(), z.unknown()),
]);

// Instance schemas
export const InstanceStatusSchema = z.enum(['creating', 'running', 'stopped', 'failed', 'destroying', 'destroyed']);

export const CreateInstanceOptionsSchema = z.object({
  name: z.string().optional(),
  region: z.string().optional(),
  image: z.string().optional(),
  size: z.string().optional(),
  memoryMb: z.number().optional(),
  metadata: MetadataSchema.optional(),
  sshKeyContent: z.string().optional(),
});

export const InstanceSchema = z.object({
  id: z.string(),
  flyMachineId: z.string(),
  name: z.string(),
  region: z.string(),
  image: z.string(),
  size: z.string(),
  memoryMb: z.number(),
  ipAddress: z.string().optional(),
  privateIpAddress: z.string().optional(),
  status: InstanceStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string().optional(),
  metadata: MetadataSchema.optional(),
});

// Command schemas
export const CommandStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'timeout']);

export const CommandExecutionSchema = z.object({
  id: z.string(),
  instanceId: z.string(),
  command: z.string(),
  status: CommandStatusSchema,
  output: z.string().optional(),
  error: z.string().optional(),
  exitCode: z.number().optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
});

// Workflow schemas
export const StepTypeSchema = z.enum(['create_instance', 'execute_command', 'wait', 'destroy_instance', 'conditional']);

// Base step schema
const BaseStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  dependsOn: z.array(z.string()).optional(),
});

// Discriminated union for workflow steps
export const WorkflowStepSchema = z.discriminatedUnion('type', [
  BaseStepSchema.extend({
    type: z.literal('create_instance'),
    config: CreateInstanceConfigSchema,
  }),
  BaseStepSchema.extend({
    type: z.literal('execute_command'),
    config: ExecuteCommandConfigSchema,
  }),
  BaseStepSchema.extend({
    type: z.literal('wait'),
    config: WaitConfigSchema,
  }),
  BaseStepSchema.extend({
    type: z.literal('destroy_instance'),
    config: DestroyInstanceConfigSchema,
  }),
  BaseStepSchema.extend({
    type: z.literal('conditional'),
    config: ConditionalConfigSchema,
  }),
]);

export const WorkflowStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(WorkflowStepSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string().optional(),
});

export const WorkflowExecutionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: WorkflowStatusSchema,
  context: z.record(z.string(), z.unknown()),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  error: z.string().optional(),
});

// Inngest event schemas
export const InstanceCreateEventSchema = z.object({
  instanceId: z.string().optional(),
  name: z.string().optional(),
  region: z.string().optional(),
  image: z.string().optional(),
  size: z.string().optional(),
  memoryMb: z.number().optional(),
  metadata: MetadataSchema.optional(),
  sshKeyContent: z.string().optional(),
});

export const InstanceDestroyEventSchema = z.object({
  instanceId: z.string(),
});

export const CommandExecuteEventSchema = z.object({
  instanceId: z.string(),
  command: z.string(),
  timeout: z.number().optional(),
  executionId: z.string().optional(),
});

export const WorkflowExecuteEventSchema = z.object({
  workflowId: z.string(),
  executionId: z.string(),
  context: z.record(z.string(), z.unknown()),
});

// Type exports
export type Instance = z.infer<typeof InstanceSchema>;
export type InstanceStatus = z.infer<typeof InstanceStatusSchema>;
export type CreateInstanceOptions = z.infer<typeof CreateInstanceOptionsSchema>;
export type CommandExecution = z.infer<typeof CommandExecutionSchema>;
export type CommandStatus = z.infer<typeof CommandStatusSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;
export type StepType = z.infer<typeof StepTypeSchema>;
