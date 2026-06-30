import { z } from 'zod';

export const ResendEmailVerificationSchema = z.object({
  email: z.string().email(),
});

export type ResendEmailVerificationDto = z.infer<typeof ResendEmailVerificationSchema>;
