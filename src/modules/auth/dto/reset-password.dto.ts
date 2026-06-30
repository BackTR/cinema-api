import { z } from 'zod';

export const ResetPasswordSchema = z.object({
    token: z.string().min(1),
    password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus ada huruf kapital')
    .regex(/[0-9]/, 'Password harus ada angka'),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;