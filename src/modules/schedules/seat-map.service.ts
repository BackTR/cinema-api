import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface SeatInfo {
  id: string;
  rowLabel: string;
  seatNumber: number;
  type: string;
  status: string;
}

export interface SeatMapResult {
  scheduleId: string;
  rows: Record<string, SeatInfo[]>;
  summary: { available: number; locked: number; booked: number; total: number };
}

@Injectable()
export class SeatMapService {
  private readonly logger = new Logger(SeatMapService.name);
  private readonly CACHE_TTL = 30; // 30 detik — realtime feel

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getSeatMap(scheduleId: string): Promise<SeatMapResult> {
    const cacheKey = `seat_map:${scheduleId}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) {
      this.logger.debug(`Seat map cache hit: ${scheduleId}`);
      return JSON.parse(cached) as SeatMapResult;
    }

    const scheduleSeats = await this.prisma.scheduleSeat.findMany({
      where: { scheduleId },
      include: {
        seat: { select: { id: true, rowLabel: true, seatNumber: true, type: true } },
      },
      orderBy: [{ seat: { rowLabel: 'asc' } }, { seat: { seatNumber: 'asc' } }],
    });

    // Group by row label: { A: [...], B: [...] }
    const rows: Record<string, SeatInfo[]> = {};
    const summary = { available: 0, locked: 0, booked: 0, total: scheduleSeats.length };

    for (const ss of scheduleSeats) {
      const row = ss.seat.rowLabel;
      if (!rows[row]) rows[row] = [];

      rows[row].push({
        id: ss.seat.id,
        rowLabel: ss.seat.rowLabel,
        seatNumber: ss.seat.seatNumber,
        type: ss.seat.type,
        status: ss.status,
      });

      if (ss.status === 'AVAILABLE') summary.available++;
      else if (ss.status === 'LOCKED') summary.locked++;
      else if (ss.status === 'BOOKED') summary.booked++;
    }

    const result: SeatMapResult = { scheduleId, rows, summary };
    await this.redis.client.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async invalidateSeatMap(scheduleId: string): Promise<void> {
    await this.redis.client.del(`seat_map:${scheduleId}`);
  }
}
