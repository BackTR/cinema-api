// src/modules/review/review.controller.ts
import {
  Controller, Get, Post, Delete, Param,
  Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewSchema, CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewSchema, QueryReviewDto } from './dto/query-review.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // Buat review baru
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Body(new ZodValidationPipe(CreateReviewSchema)) dto: CreateReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reviewService.createReview(user.sub, dto);
  }

  // Cek apakah user bisa review film
  @Get('can-review/:movieId')
  @UseGuards(JwtAuthGuard)
  async canReview(
    @Param('movieId') movieId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reviewService.canUserReview(user.sub, movieId);
  }

  // Review per film (public)
  @Get('movie/:movieId')
  async getMovieReviews(
    @Param('movieId') movieId: string,
    @Query(new ZodValidationPipe(QueryReviewSchema)) query: QueryReviewDto,
  ) {
    return this.reviewService.getMovieReviews(movieId, query);
  }

  // Review milik user
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyReviews(@CurrentUser() user: JwtPayload) {
    return this.reviewService.getUserReviews(user.sub);
  }

  // Hapus review
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deleteReview(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reviewService.deleteReview(id, user.sub);
  }
}