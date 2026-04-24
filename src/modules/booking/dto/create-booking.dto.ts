import { z } from 'zod';

export const CreateBookingSchema = z.object({
  scheduleId: z.string().uuid('scheduleId harus UUID valid'),
  scheduleSeatIds: z
    .array(z.string().uuid('scheduleSeatId harus UUID valid'))
    .min(1, 'Minimal pilih 1 kursi')
    .max(8, 'Maksimal 8 kursi per transaksi'),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;