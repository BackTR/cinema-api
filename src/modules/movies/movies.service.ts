import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { QueryMovieDto } from './dto/query-movie.dto';
import { Movie } from '@prisma/client';

interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);
  private readonly CACHE_TTL = 300; // 5 menit

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: QueryMovieDto): Promise<PaginatedResult<Movie>> {
    const { search, genre, rating, isActive, page, limit } = query;
    const skip = (page - 1) * limit;

    // Cache key berdasarkan query params
    const cacheKey = `movies:list:${JSON.stringify(query)}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return JSON.parse(cached) as PaginatedResult<Movie>;
    }

    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { synopsis: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(genre && { genre: { contains: genre, mode: 'insensitive' as const } }),
      ...(rating && { rating }),
      ...(isActive !== undefined && { isActive }),
    };

    const [movies, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: { releaseDate: 'desc' },
      }),
      this.prisma.movie.count({ where }),
    ]);

    const result: PaginatedResult<Movie> = {
      data: movies,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    // Simpan ke cache
    await this.redis.client.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async findOne(id: string): Promise<Movie> {
    const cacheKey = `movies:${id}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) return JSON.parse(cached) as Movie;

    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException(`Film dengan ID ${id} tidak ditemukan`);

    await this.redis.client.setex(cacheKey, this.CACHE_TTL, JSON.stringify(movie));
    return movie;
  }

  async create(dto: CreateMovieDto): Promise<Movie> {
    // Cek duplikat judul + tanggal rilis
    const existing = await this.prisma.movie.findFirst({
      where: {
        title: { equals: dto.title, mode: 'insensitive' },
        releaseDate: new Date(dto.releaseDate),
      },
    });
    if (existing) throw new ConflictException('Film dengan judul dan tanggal rilis yang sama sudah ada');

    const movie = await this.prisma.movie.create({
      data: { ...dto, releaseDate: new Date(dto.releaseDate) },
    });

    await this.invalidateListCache();
    this.logger.log(`Movie created: ${movie.title}`);
    return movie;
  }

  async update(id: string, dto: UpdateMovieDto): Promise<Movie> {
    await this.findOne(id); // throw 404 jika tidak ada

    const movie = await this.prisma.movie.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.releaseDate && { releaseDate: new Date(dto.releaseDate) }),
      },
    });

    // Invalidate cache film ini + list
    await Promise.all([
      this.redis.client.del(`movies:${id}`),
      this.invalidateListCache(),
    ]);

    return movie;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    // Soft delete — set isActive = false
    await this.prisma.movie.update({
      where: { id },
      data: { isActive: false },
    });

    await Promise.all([
      this.redis.client.del(`movies:${id}`),
      this.invalidateListCache(),
    ]);

    this.logger.log(`Movie deactivated: ${id}`);
  }

  // Hapus semua cache list movies (pattern delete)
  private async invalidateListCache(): Promise<void> {
    const keys = await this.redis.client.keys('movies:list:*');
    if (keys.length > 0) await this.redis.client.del(...keys);
  }
}