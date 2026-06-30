import { z } from 'zod';

export const CancelBookingSchema = z.object({
  reason: z.string().min(3).max(255).optional(),
});

export type CancelBookingDto = z.infer<typeof CancelBookingSchema>;
