import { z } from 'zod';

// Base schemas
export const MetadataSchema = z.record(z.string(), z.unknown());

// Instance schemas
export const InstanceStatusSchema = z.enum(['creating', 'running', 'stopped', 'failed', 'destroying', 'destroyed']);

export const CreateInstanceOptionsSchema = z.object({
  name: z.string().optional(),
  region: z.string().optional(),
  image: z.string().optional(),
  size: z.string().optional(),
  memoryMb: z.number().optional(),
  metadata: MetadataSchema.optional(),
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

// Inngest event schemas
export const InstanceCreateEventSchema = z.object({
  instanceId: z.string().optional(),
  name: z.string().optional(),
  region: z.string().optional(),
  image: z.string().optional(),
  size: z.string().optional(),
  memoryMb: z.number().optional(),
  metadata: MetadataSchema.optional(),
});

export const InstanceDestroyEventSchema = z.object({
  instanceId: z.string(),
});

export const InstanceHealthCheckEventSchema = z.object({
  instanceId: z.string(),
});

export const InstanceRestartEventSchema = z.object({
  instanceId: z.string(),
});

// Type exports
export type Instance = z.infer<typeof InstanceSchema>;
export type InstanceStatus = z.infer<typeof InstanceStatusSchema>;
export type CreateInstanceOptions = z.infer<typeof CreateInstanceOptionsSchema>;
