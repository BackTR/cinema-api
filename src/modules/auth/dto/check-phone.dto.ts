import { z } from 'zod';

export const CheckPhoneSchema = z.object({
    phone: z.string().regex(/^(\+62|62|0)8[0-9]{8,11}$/, 'Format nomor HP tidak valid'),
});

export type CheckPhoneDto = z.infer<typeof CheckPhoneSchema>;