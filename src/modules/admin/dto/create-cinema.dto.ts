import { z } from 'zod';

export const CreateCinemaSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5),
  city: z.string().min(2).max(100),
  phone: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type CreateCinemaDto = z.infer<typeof CreateCinemaSchema>;