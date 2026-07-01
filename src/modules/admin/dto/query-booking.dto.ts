import { z } from 'zod';

export const QueryBookingSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED']).optional(),
  scheduleId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(v ? parseInt(v, 10) : 10, 50)),
});

export type QueryBookingDto = z.infer<typeof QueryBookingSchema>;
