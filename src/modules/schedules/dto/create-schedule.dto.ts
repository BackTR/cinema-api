import { z } from 'zod';

export const CreateScheduleSchema = z.object({
  movieId: z.string().uuid(),
  studioId: z.string().uuid(),
  showTime: z.string().datetime({ message: 'Format showTime tidak valid (ISO 8601)' }),
  basePrice: z.number().positive().max(999999),
});

export type CreateScheduleDto = z.infer<typeof CreateScheduleSchema>;
