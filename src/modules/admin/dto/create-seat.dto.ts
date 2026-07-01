import { z } from 'zod';

export const CreateSeatsSchema = z.object({
  studioId: z.string().uuid(),
  rows: z.array(z.string().min(1).max(1)),
  seatsPerRow: z.number().int().min(1).max(30),
  vipRows: z.array(z.string().min(1).max(1)).optional(),
});

export type CreateSeatsDto = z.infer<typeof CreateSeatsSchema>;
