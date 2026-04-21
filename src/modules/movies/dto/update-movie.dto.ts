import { z } from 'zod';
import { CreateMovieSchema } from './create-movie.dto';

export const UpdateMovieSchema = CreateMovieSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateMovieDto = z.infer<typeof UpdateMovieSchema>;