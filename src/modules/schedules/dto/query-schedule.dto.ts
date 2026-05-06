import { z } from 'zod';

export const QueryScheduleSchema = z.object({
  movieId: z.string().uuid().optional(),
  cinemaId: z.string().uuid().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal: YYYY-MM-DD')
    .optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(val ? parseInt(val, 10) : 10, 50)),
});

export type QueryScheduleDto = z.infer<typeof QueryScheduleSchema>;