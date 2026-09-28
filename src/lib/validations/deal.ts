import { z } from 'zod';

export const dealSchema = z.object({
  name: z.string().min(1, 'Deal name is required'),
  amount: z.number().min(0, 'Amount must be non-negative').default(0),
  pipelineId: z.string().min(1, 'Pipeline is required'),
  stageId: z.string().min(1, 'Stage is required'),
  companyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  status: z.enum(['OPEN', 'WON', 'LOST']).default('OPEN'),
});

export const updateDealStageSchema = z.object({
  dealId: z.string().min(1, 'Deal ID is required'),
  stageId: z.string().min(1, 'Stage ID is required'),
  status: z.enum(['OPEN', 'WON', 'LOST']).optional(),
});

export type DealInput = z.infer<typeof dealSchema>;
export type UpdateDealStageInput = z.infer<typeof updateDealStageSchema>;
