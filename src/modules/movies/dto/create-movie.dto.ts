import { z } from 'zod';

export const CreateMovieSchema = z.object({
  title: z.string().min(1).max(200),
  synopsis: z.string().min(10),
  durationMinutes: z.number().int().min(30).max(360),
  genre: z.string().min(1).max(100),
  rating: z.enum(['SU', '13+', '17+', '21+']),
  posterUrl: z.string().url().optional(),
  trailerUrl: z.string().url().optional(),
  director: z.string().optional(),
  cast: z.string().optional(),
  language: z.enum(['INDONESIA', 'ENGLISH', 'SUBTITLED']).optional(),
  format: z.enum(['TWO_D', 'THREE_D', 'IMAX', 'FOUR_DX']).optional(), 
  releaseDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Format tanggal harus YYYY-MM-DD',
  ),
  endDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Format tanggal harus YYYY-MM-DD',
  ).optional(),
});

export type CreateMovieDto = z.infer<typeof CreateMovieSchema>;