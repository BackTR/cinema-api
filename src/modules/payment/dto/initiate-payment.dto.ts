import { z } from 'zod';

export const InitiatePaymentSchema = z.object({
  bookingCode: z.string().min(1),
});

export type InitiatePaymentDto = z.infer<typeof InitiatePaymentSchema>;
