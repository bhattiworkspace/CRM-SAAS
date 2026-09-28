import { z } from 'zod';

export const activitySchema = z.object({
  type: z.enum(['CALL', 'MEETING', 'EMAIL', 'NOTE', 'SYSTEM']),
  title: z.string().min(1, 'Activity title is required'),
  description: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});

export type ActivityInput = z.infer<typeof activitySchema>;
