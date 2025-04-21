import { z } from 'zod';

export const MessageTypeSchema = z.enum(['command', 'response', 'event', 'error']);
export type MessageType = z.infer<typeof MessageTypeSchema>;
