import { z } from 'zod';

// Valid Fly.io regions
export const FLY_REGIONS = [
  'ams',
  'arn',
  'atl',
  'bog',
  'bom',
  'bos',
  'cdg',
  'den',
  'dfw',
  'ewr',
  'eze',
  'fra',
  'gdl',
  'gig',
  'gru',
  'hkg',
  'iad',
  'jnb',
  'lax',
  'lhr',
  'maa',
  'mad',
  'mia',
  'nrt',
  'ord',
  'otp',
  'phx',
  'qro',
  'scl',
  'sea',
  'sin',
  'sjc',
  'syd',
  'waw',
  'yul',
  'yyz',
] as const;

// Valid machine sizes
export const MACHINE_SIZES = [
  'shared-cpu-1x',
  'shared-cpu-2x',
  'shared-cpu-4x',
  'shared-cpu-8x',
  'performance-1x',
  'performance-2x',
  'performance-4x',
  'performance-8x',
  'performance-16x',
] as const;

// Instance status enum
export const INSTANCE_STATUS = [
  'creating',
  'running',
  'stopped',
  'stopping',
  'starting',
  'destroying',
  'destroyed',
  'failed',
  'provisioning',
  'unknown',
] as const;

export const instanceNameSchema = z
  .string()
  .min(1, 'Instance name is required')
  .max(50, 'Instance name must be 50 characters or less')
  .regex(/^[a-zA-Z0-9-]+$/, 'Instance name can only contain letters, numbers, and hyphens');

export const githubRepoUrlSchema = z
  .string()
  .url('Invalid URL format')
  .regex(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+(.git)?$/, 'Must be a valid GitHub repository URL')
  .transform((url) => url.replace(/\.git$/, '')); // Normalize by removing .git suffix

export const createInstanceSchema = z
  .object({
    name: instanceNameSchema,
    region: z.enum(FLY_REGIONS).optional().default('iad'),
    image: z.string().optional().default('docker.io/library/ubuntu:22.04'),
    size: z.enum(MACHINE_SIZES).optional().default('shared-cpu-1x'),
    memoryMb: z
      .number()
      .int('Memory must be an integer')
      .min(256, 'Minimum memory is 256MB')
      .max(65536, 'Maximum memory is 65536MB')
      .optional()
      .default(512),
    repoUrl: githubRepoUrlSchema.optional(),
    secrets: z
      .object({
        githubToken: z
          .string()
          .min(1, 'GitHub token is required when providing secrets')
          .regex(/^(ghp_|gho_|github_pat_)/, 'Invalid GitHub token format'),
        githubUsername: z
          .string()
          .min(1, 'GitHub username is required')
          .regex(/^[a-zA-Z0-9-]+$/, 'Invalid GitHub username format'),
      })
      .optional(),
    metadata: z.record(z.string()).optional(),
  })
  .refine(
    (data) => {
      // If repoUrl is provided, secrets must also be provided
      if (data.repoUrl && !data.secrets) {
        return false;
      }
      return true;
    },
    {
      message: 'GitHub secrets are required when providing a repository URL',
      path: ['secrets'],
    },
  );

export const instanceIdSchema = z
  .string()
  .min(1, 'Instance ID is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid instance ID format');

export const instanceStatusSchema = z.enum(INSTANCE_STATUS);

export const instanceSchema = z.object({
  id: instanceIdSchema,
  flyMachineId: z.string(),
  name: instanceNameSchema,
  region: z.enum(FLY_REGIONS),
  image: z.string(),
  size: z.enum(MACHINE_SIZES),
  memoryMb: z.number(),
  status: instanceStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  privateIpAddress: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Export types
export type CreateInstanceOptions = z.infer<typeof createInstanceSchema>;
export type Instance = z.infer<typeof instanceSchema>;
export type InstanceStatus = z.infer<typeof instanceStatusSchema>;
export type FlyRegion = (typeof FLY_REGIONS)[number];
export type MachineSize = (typeof MACHINE_SIZES)[number];
