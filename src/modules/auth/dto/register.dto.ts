import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus ada huruf kapital')
    .regex(/[0-9]/, 'Password harus ada angka'),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
