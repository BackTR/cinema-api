import { z } from 'zod';

export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid('bookingId harus UUID valid'),
  movieId: z.string().uuid('movieId harus UUID valid'),
  rating: z
    .number()
    .int()
    .min(1, 'Rating minimal 1')
    .max(5, 'Rating maksimal 5'),
  comment: z.string().max(1000, 'Komentar maksimal 1000 karakter').optional(),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;