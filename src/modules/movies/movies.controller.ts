import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
  UseGuards, UsePipes,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import { CreateMovieSchema, CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieSchema, UpdateMovieDto } from './dto/update-movie.dto';
import { QueryMovieSchema, QueryMovieDto } from './dto/query-movie.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, Movie } from '@prisma/client';

interface PaginatedMovies {
  data: Movie[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  // Public — siapa saja bisa lihat daftar film
  @Get()
  async findAll(
    @Query(new ZodValidationPipe(QueryMovieSchema)) query: QueryMovieDto,
  ): Promise<PaginatedMovies> {
    return this.moviesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Movie> {
    return this.moviesService.findOne(id);
  }

  // Admin only — hanya ADMIN yang bisa create/update/delete
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(CreateMovieSchema))
  async create(@Body() dto: CreateMovieDto): Promise<Movie> {
    return this.moviesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMovieSchema)) dto: UpdateMovieDto,
  ): Promise<Movie> {
    return this.moviesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string): Promise<void> {
    return this.moviesService.remove(id);
  }
}