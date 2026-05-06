import { z } from 'zod';

export const QueryMovieSchema = z.object({
  search: z.string().optional(),
  genre: z.string().optional(),
  rating: z.enum(['SU', '13+', '17+', '21+']).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const n = val ? parseInt(val, 10) : 10;
      return Math.min(n, 50); // max 50 per page
    }),
});

export type QueryMovieDto = z.infer<typeof QueryMovieSchema>;