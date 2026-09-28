import { z } from 'zod';

export const sequenceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(z.any()).optional(),
});

export const enrollmentSchema = z.object({
  leadId: z.string().optional(),
  contactId: z.string().optional(),
});

export const enrollmentUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ERROR']),
});
