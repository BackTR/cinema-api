import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SeatMapService, SeatMapResult } from './seat-map.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';
import { Prisma, Schedule } from '@prisma/client';

interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);
  private readonly CACHE_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly seatMapService: SeatMapService,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: QueryScheduleDto): Promise<PaginatedResult<Schedule>> {
    const { movieId, cinemaId, date, page, limit } = query;
    const skip = (page - 1) * limit;

    const cacheKey = `schedules:list:${JSON.stringify(query)}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return JSON.parse(cached) as PaginatedResult<Schedule>;
    }

    // ← Fix poin 3 & 19: pisahkan filter date dan filter future
    let showTimeFilter: Prisma.ScheduleWhereInput['showTime'];

    if (date) {
      // Filter by date dengan timezone WIB (UTC+7)
      const startOfDay = new Date(`${date}T00:00:00+07:00`);
      const endOfDay = new Date(`${date}T23:59:59+07:00`);
      showTimeFilter = { gte: startOfDay, lte: endOfDay };
    } else {
      // Default: tampilkan jadwal yang belum lewat
      showTimeFilter = { gte: new Date() };
    }

    const where: Prisma.ScheduleWhereInput = {
      isActive: true,
      showTime: showTimeFilter,
      ...(movieId && { movieId }),
      ...(cinemaId && { studio: { cinemaId } }),
    };

    const [schedules, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { showTime: 'asc' },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              durationMinutes: true,
              rating: true,
              posterUrl: true,
            },
          },
          studio: {
            select: {
              id: true,
              name: true,
              type: true,
              cinema: { select: { id: true, name: true, city: true } },
            },
          },
        },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    const result = {
      data: schedules,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    await this.redis.client.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async findOne(id: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        movie: true,
        studio: { include: { cinema: true } },
      },
    });
    if (!schedule) throw new NotFoundException(`Jadwal dengan ID ${id} tidak ditemukan`);
    return schedule;
  }

  async create(dto: CreateScheduleDto): Promise<Schedule> {
    const [movie, studio] = await Promise.all([
      this.prisma.movie.findUnique({ where: { id: dto.movieId } }),
      this.prisma.studio.findUnique({
        where: { id: dto.studioId },
        include: { seats: true },
      }),
    ]);

    if (!movie) throw new NotFoundException('Film tidak ditemukan');
    if (!studio) throw new NotFoundException('Studio tidak ditemukan');

    const showTime = new Date(dto.showTime);
    const endTime = new Date(showTime.getTime() + movie.durationMinutes * 60 * 1000);

    // Fix: proper interval overlap detection
    // Overlap terjadi jika: startA < endB AND endA > startB
    const conflict = await this.prisma.schedule.findFirst({
      where: {
        studioId: dto.studioId,
        isActive: true,
        AND: [
          { showTime: { lt: endTime } }, // jadwal lama mulai sebelum jadwal baru selesai
          { endTime: { gt: showTime } }, // jadwal lama selesai setelah jadwal baru mulai
        ],
      },
    });

    if (conflict) {
      throw new ConflictException(
        `Studio sudah ada jadwal yang bentrok: ${conflict.showTime.toISOString()} — ${conflict.endTime.toISOString()}`,
      );
    }

    const schedule = await this.prisma.$transaction(async (tx) => {
      const newSchedule = await tx.schedule.create({
        data: {
          movieId: dto.movieId,
          studioId: dto.studioId,
          showTime,
          endTime,
          basePrice: new Prisma.Decimal(dto.basePrice),
        },
      });

      await tx.scheduleSeat.createMany({
        data: studio.seats.map((seat) => ({
          scheduleId: newSchedule.id,
          seatId: seat.id,
          status: 'AVAILABLE' as const,
        })),
      });

      this.logger.log(`Schedule created: ${newSchedule.id} with ${studio.seats.length} seats`);
      return newSchedule;
    });

    await this.invalidateListCache();

    return schedule;
  }

  async getSeatMap(scheduleId: string): Promise<SeatMapResult> {
    await this.findOne(scheduleId); // validasi schedule ada
    return this.seatMapService.getSeatMap(scheduleId);
  }

  async deactivate(id: string): Promise<Schedule> {
    await this.findOne(id);
    const updated = await this.prisma.schedule.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateListCache();

    return updated;
  }

  async getCinemas() {
    return this.prisma.cinema.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
        studios: {
          where: { isActive: true },
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { city: 'asc' },
    });
  }

  async getPricingRules(scheduleId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        pricingRules: {
          where: { isActive: true },
          select: { seatType: true, price: true },
        },
      },
    });

    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');

    return {
      basePrice: schedule.basePrice,
      pricingRules: schedule.pricingRules,
    };
  }

  async createPricingRule(
    scheduleId: string,
    dto: { seatType: 'REGULAR' | 'VIP'; pricingType: string; price: number },
  ) {
    await this.findOne(scheduleId);

    const rule = await this.prisma.pricingRule.upsert({
      where: {
        scheduleId_seatType_pricingType: {
          scheduleId,
          seatType: dto.seatType,
          pricingType: dto.pricingType as 'BASE',
        },
      },
      update: { price: new Prisma.Decimal(dto.price) },
      create: {
        scheduleId,
        seatType: dto.seatType,
        pricingType: dto.pricingType as 'BASE',
        price: new Prisma.Decimal(dto.price),
        isActive: true,
      },
    });

    await this.invalidateListCache();

    return rule;
  }

  private async invalidateListCache(): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.client.scan(cursor, 'MATCH', 'schedules:list:*', 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.client.del(...keys);
      }
    } while (cursor !== '0');
  }
}
