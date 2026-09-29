import { z } from 'zod';

export const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  title: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED']).default('NEW'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  source: z.string().default('MANUAL'),
  ownerId: z.string().optional().nullable(),
  estimatedValue: z.number().min(0).optional().nullable(),
});

export const convertLeadSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  companyId: z.string().optional().nullable(),
  newCompanyName: z.string().optional().nullable(),
  createDeal: z.boolean().default(false),
  dealName: z.string().optional().nullable(),
  dealAmount: z.number().min(0).optional().default(0),
  pipelineId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
