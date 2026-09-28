import { z } from 'zod';

export const conversationSchema = z.object({
  channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS']),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  recipientAddress: z.string().optional(),
});
