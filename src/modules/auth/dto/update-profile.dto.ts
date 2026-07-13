import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^(\+62|62|0)8[0-9]{8,11}$/, 'Format nomor HP tidak valid')
    .optional()
    .or(z.literal('')),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;