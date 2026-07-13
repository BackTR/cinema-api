import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    // 1. Validasi booking milik user dan sudah CONFIRMED
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: dto.bookingId,
        userId,
        status: 'CONFIRMED',
      },
      include: {
        schedule: { select: { movieId: true, showTime: true } },
      },
    });

    if (!booking) {
      throw new BadRequestException(
        'Booking tidak ditemukan, bukan milik kamu, atau belum dikonfirmasi',
      );
    }

    // 2. Pastikan film yang direview sesuai dengan booking
    if (booking.schedule.movieId !== dto.movieId) {
      throw new BadRequestException('Film tidak sesuai dengan booking');
    }

    // 3. Hanya bisa review setelah jam tayang lewat
    if (new Date() < booking.schedule.showTime) {
      throw new BadRequestException(
        'Kamu baru bisa memberikan review setelah film selesai ditayangkan',
      );
    }

    // 4. Cek sudah pernah review film ini
    const existing = await this.prisma.review.findUnique({
      where: { userId_movieId: { userId, movieId: dto.movieId } },
    });

    if (existing) {
      throw new BadRequestException(
        'Kamu sudah memberikan review untuk film ini',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        movieId: dto.movieId,
        bookingId: dto.bookingId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: { select: { name: true, avatarUrl: true } },
      },
    });

    this.logger.log(`Review created for movie ${dto.movieId} by user ${userId}`);
    return review;
  }

  async getMovieReviews(movieId: string, query: QueryReviewDto) {
    const { page, limit, rating } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      movieId,
      isVisible: true,
      ...(rating && { rating }),
    };

    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
      // Agregasi rating
      this.prisma.review.aggregate({
        where: { movieId, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    // Hitung distribusi rating (1-5)
    const distribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { movieId, isVisible: true },
      _count: { rating: true },
      orderBy: { rating: 'desc' },
    });

    const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: distribution.find((d) => d.rating === star)?._count.rating ?? 0,
    }));

    return {
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      stats: {
        average: Number((stats._avg.rating ?? 0).toFixed(1)),
        total: stats._count.rating,
        distribution: ratingDist,
      },
    };
  }

  async getUserReviews(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        movie: {
          select: { id: true, title: true, posterUrl: true },
        },
      },
    });
  }

  async canUserReview(userId: string, movieId: string): Promise<{
    canReview: boolean;
    reason?: string;
    bookingId?: string;
  }> {
    // Cek sudah review
    const existing = await this.prisma.review.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });

    if (existing) {
      return { canReview: false, reason: 'already_reviewed' };
    }

    // Cari booking yang eligible
    const booking = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: 'CONFIRMED',
        schedule: {
          movieId,
          showTime: { lte: new Date() }, // jadwal sudah lewat
        },
      },
      select: { id: true },
    });

    if (!booking) {
      return { canReview: false, reason: 'no_eligible_booking' };
    }

    return { canReview: true, bookingId: booking.id };
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException('Review tidak ditemukan');
    if (review.userId !== userId) throw new ForbiddenException('Akses ditolak');

    await this.prisma.review.delete({ where: { id: reviewId } });
    return { message: 'Review berhasil dihapus' };
  }

  // Admin — toggle visibility
  async toggleVisibility(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review tidak ditemukan');

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isVisible: !review.isVisible },
    });
  }
}