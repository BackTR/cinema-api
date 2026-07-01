// src/modules/auth/dto/verify-phone-otp.dto.ts
import { z } from 'zod';

export const VerifyPhoneOtpSchema = z.object({
  phone: z.string().regex(/^(\+62|62|0)8[0-9]{8,11}$/),
  otp: z.string().length(6, 'Kode OTP harus 6 digit'),
});

export type VerifyPhoneOtpDto = z.infer<typeof VerifyPhoneOtpSchema>;
