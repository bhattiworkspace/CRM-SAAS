import { z } from 'zod';

export const businessSearchSchema = z.object({
  query: z.string().default(''),
  category: z.string().optional(),
  location: z.string().optional(),
});

export const businessImportSchema = z.object({
  businesses: z.array(
    z.object({
      providerId: z.string(),
      name: z.string(),
      category: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      rating: z.number().optional().nullable(),
      reviewCount: z.number().optional().nullable(),
    })
  ),
  createAsLead: z.boolean().default(true),
  assigneeId: z.string().optional().nullable(),
});

export type BusinessSearchInput = z.infer<typeof businessSearchSchema>;
export type BusinessImportInput = z.infer<typeof businessImportSchema>;
