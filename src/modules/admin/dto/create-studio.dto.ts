import { z } from 'zod';

export const CreateStudioSchema = z.object({
  cinemaId: z.string().uuid(),
  name: z.string().min(1).max(50),
  type: z.enum(['REGULAR', 'PREMIUM', 'IMAX']).default('REGULAR'),
});

export type CreateStudioDto = z.infer<typeof CreateStudioSchema>;