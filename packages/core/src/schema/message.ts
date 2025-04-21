import { z } from 'zod';
import { MessageTypeSchema } from './message-type';

// Define Message schema

export const MessageSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().int().positive(),
  sender: z.string().min(1),
  recipient: z.string().min(1),
  content: z.string(),
  type: MessageTypeSchema,
});
export type Message = z.infer<typeof MessageSchema>;
