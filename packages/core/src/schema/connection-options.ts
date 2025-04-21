import { z } from 'zod';

// Define ConnectionOptions schema

export const ConnectionOptionsSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(8080),
  secure: z.boolean().default(false),
  timeout: z.number().int().positive().default(5000),
});
export type ConnectionOptions = z.infer<typeof ConnectionOptionsSchema>;
