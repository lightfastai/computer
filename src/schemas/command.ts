import { z } from 'zod';

// Allowed commands for security
export const ALLOWED_COMMANDS = [
  'ls',
  'grep',
  'find',
  'cat',
  'echo',
  'pwd',
  'env',
  'ps',
  'df',
  'du',
  'git',
  'which',
  'whoami',
  'hostname',
  'date',
  'uptime',
  'free',
  'head',
  'tail',
  'wc',
  'sort',
  'uniq',
  'diff',
  'tree',
  'file',
  'stat',
] as const;

export const commandExecutionStatusSchema = z.enum(['running', 'completed', 'failed', 'timeout']);

export const executeCommandSchema = z.object({
  command: z
    .string()
    .min(1, 'Command is required')
    .max(1000, 'Command is too long')
    .refine(
      (cmd) => {
        const baseCommand = cmd.split(' ')[0];
        return ALLOWED_COMMANDS.includes(baseCommand as (typeof ALLOWED_COMMANDS)[number]);
      },
      (cmd) => ({
        message: `Command '${cmd.split(' ')[0]}' is not allowed. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`,
      }),
    ),
  args: z.array(z.string().max(200, 'Argument is too long')).max(50, 'Too many arguments').optional().default([]),
  timeout: z
    .number()
    .int('Timeout must be an integer')
    .min(1000, 'Minimum timeout is 1 second')
    .max(300000, 'Maximum timeout is 5 minutes')
    .optional()
    .default(30000), // 30 seconds default
});

export const commandExecutionSchema = z.object({
  id: z.string(),
  instanceId: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  output: z.string(),
  error: z.string(),
  exitCode: z.number().nullable(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  status: commandExecutionStatusSchema,
});

// Export types
export type ExecuteCommandOptions = z.infer<typeof executeCommandSchema>;
export type CommandExecution = z.infer<typeof commandExecutionSchema>;
export type CommandExecutionStatus = z.infer<typeof commandExecutionStatusSchema>;
export type AllowedCommand = (typeof ALLOWED_COMMANDS)[number];
