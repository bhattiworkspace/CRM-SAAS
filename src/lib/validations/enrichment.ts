import { z } from 'zod';

export const companyEnrichmentSchema = z.object({
  domain: z.string().min(1),
});
