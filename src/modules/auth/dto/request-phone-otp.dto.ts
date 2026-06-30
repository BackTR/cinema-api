import { z } from 'zod';

export const RequestPhoneOtpSchema = z.object({
  phone: z.string().regex(/^(\+62|62|0)8[0-9]{8,11}$/, 'Format nomor HP tidak valid'),
  name: z.string().min(2).max(100).optional(),
});

export type RequestPhoneOtpDto = z.infer<typeof RequestPhoneOtpSchema>;
