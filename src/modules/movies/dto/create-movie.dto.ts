import { z } from 'zod';

export const CreateMovieSchema = z.object({
  title: z.string().min(1).max(200),
  synopsis: z.string().min(10),
  durationMinutes: z.number().int().min(30).max(360),
  genre: z.string().min(1).max(100),
  rating: z.enum(['SU', '13+', '17+', '21+']),
  posterUrl: z.string().url().optional(),
  releaseDate: z.string().datetime({ message: 'Format tanggal tidak valid (ISO 8601)' }),
});

export type CreateMovieDto = z.infer<typeof CreateMovieSchema>;