import { z } from 'zod';

export const VerifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
