import { z } from 'zod';

export const QueryReviewSchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => Math.min(v ? parseInt(v, 10) : 10, 50)),
  rating: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
});

export type QueryReviewDto = z.infer<typeof QueryReviewSchema>;