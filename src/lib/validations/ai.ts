import { z } from 'zod';

export const aiConversationSchema = z.object({
  title: z.string().optional().nullable(),
  contextType: z.enum(['LEAD', 'CONTACT', 'COMPANY', 'DEAL', 'GENERAL']).optional().nullable(),
  contextId: z.string().optional().nullable(),
});

export const aiMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
});

export const aiScoreSchema = z.object({
  entityType: z.enum(['LEAD', 'DEAL', 'CONTACT']),
  entityId: z.string().min(1, 'Entity ID is required'),
});

export const aiSummarySchema = z.object({
  entityType: z.enum(['LEAD', 'DEAL', 'CONTACT', 'COMPANY']),
  entityId: z.string().min(1, 'Entity ID is required'),
  summaryType: z.enum(['OVERVIEW', 'MEETING_PREP', 'DEAL_ANALYSIS']).default('OVERVIEW'),
});
