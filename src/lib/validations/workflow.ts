import { z } from 'zod';

export const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.string(),
  isActive: z.boolean().default(false),
  conditions: z.array(z.any()).optional(),
  actions: z.array(z.any()).optional(),
});

export const workflowUpdateSchema = workflowSchema.partial();
