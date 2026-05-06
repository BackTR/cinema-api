import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { CreateStudioDto } from './dto/create-studio.dto';
import { CreateSeatsDto } from './dto/create-seat.dto';
import { QueryBookingDto } from './dto/query-booking.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard ───────────────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalMovies,
      totalCinemas,
      totalBookings,
      confirmedBookings,
      todayBookings,
      monthlyRevenue,
      totalRevenue,
      recentBookings,
    ] = await Promise.all([
      this.prisma.movie.count({ where: { isActive: true } }),
      this.prisma.cinema.count({ where: { isActive: true } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.booking.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          schedule: {
            include: { movie: { select: { title: true } } },
          },
          payment: { select: { status: true, amount: true } },
        },
      }),
    ]);

    // Top movies berdasarkan booking confirmed
    const topMoviesRaw = await this.prisma.booking.groupBy({
      by: ['scheduleId'],
      where: { status: 'CONFIRMED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topMovies = await Promise.all(
      topMoviesRaw.map(async (item) => {
        const schedule = await this.prisma.schedule.findUnique({
          where: { id: item.scheduleId },
          include: { movie: { select: { title: true, posterUrl: true } } },
        });
        return {
          movieTitle: schedule?.movie.title ?? 'Unknown',
          posterUrl: schedule?.movie.posterUrl ?? null,
          totalBookings: item._count.id,
        };
      }),
    );

    return {
      overview: {
        totalMovies,
        totalCinemas,
        totalBookings,
        confirmedBookings,
        todayBookings,
        conversionRate:
          totalBookings > 0
            ? ((confirmedBookings / totalBookings) * 100).toFixed(1) + '%'
            : '0%',
      },
      revenue: {
        monthly: Number(monthlyRevenue._sum.amount ?? 0),
        total: Number(totalRevenue._sum.amount ?? 0),
      },
      recentBookings,
      topMovies,
    };
  }

  // ─── Cinema ──────────────────────────────────────────────────────

  async getCinemas() {
    return this.prisma.cinema.findMany({
      include: {
        _count: { select: { studios: true } },
        studios: {
          where: { isActive: true },
          include: { _count: { select: { seats: true } } },
        },
      },
      orderBy: { city: 'asc' },
    });
  }

  async createCinema(dto: CreateCinemaDto) {
    const cinema = await this.prisma.cinema.create({ data: dto });
    this.logger.log(`Cinema created: ${cinema.name} — ${cinema.city}`);
    return cinema;
  }

  async updateCinema(id: string, dto: Partial<CreateCinemaDto>) {
    await this.findCinemaOrThrow(id);
    return this.prisma.cinema.update({ where: { id }, data: dto });
  }

  async deleteCinema(id: string) {
    await this.findCinemaOrThrow(id);
    await this.prisma.cinema.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Bioskop berhasil dinonaktifkan' };
  }

  // ─── Studio ──────────────────────────────────────────────────────

  async getStudios(cinemaId: string) {
    await this.findCinemaOrThrow(cinemaId);
    return this.prisma.studio.findMany({
      where: { cinemaId },
      include: { _count: { select: { seats: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createStudio(dto: CreateStudioDto) {
    await this.findCinemaOrThrow(dto.cinemaId);
    const studio = await this.prisma.studio.create({ data: dto });
    this.logger.log(`Studio created: ${studio.name}`);
    return studio;
  }

  // ─── Seats ───────────────────────────────────────────────────────

  async getSeats(studioId: string) {
    const studio = await this.prisma.studio.findUnique({ where: { id: studioId } });
    if (!studio) throw new NotFoundException('Studio tidak ditemukan');

    const seats = await this.prisma.seat.findMany({
      where: { studioId },
      orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
    });

    // Group by row
    const grouped: Record<string, typeof seats> = {};
    for (const seat of seats) {
      if (!grouped[seat.rowLabel]) grouped[seat.rowLabel] = [];
      grouped[seat.rowLabel].push(seat);
    }

    return { studioId, totalSeats: seats.length, rows: grouped };
  }

  async createSeats(dto: CreateSeatsDto) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: dto.studioId },
    });
    if (!studio) throw new NotFoundException('Studio tidak ditemukan');

    const seats = [];
    for (const row of dto.rows) {
      for (let num = 1; num <= dto.seatsPerRow; num++) {
        seats.push({
          studioId: dto.studioId,
          rowLabel: row.toUpperCase(),
          seatNumber: num,
          type: dto.vipRows?.map((r) => r.toUpperCase()).includes(row.toUpperCase())
            ? ('VIP' as const)
            : ('REGULAR' as const),
        });
      }
    }

    await this.prisma.seat.createMany({
      data: seats,
      skipDuplicates: true,
    });

    const totalSeats = await this.prisma.seat.count({
      where: { studioId: dto.studioId },
    });

    this.logger.log(`Created ${seats.length} seats for studio: ${dto.studioId}`);
    return {
      message: `${seats.length} kursi berhasil dibuat`,
      totalSeats,
    };
  }

  // ─── Booking Management ──────────────────────────────────────────

  async getAllBookings(query: QueryBookingDto) {
    const { status, scheduleId, userId, page, limit } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(scheduleId && { scheduleId }),
      ...(userId && { userId }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          schedule: {
            include: {
              movie: { select: { title: true } },
              studio: {
                select: { name: true, cinema: { select: { name: true } } },
              },
            },
          },
          payment: { select: { status: true, paidAt: true, amount: true } },
          _count: { select: { seats: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Ticket Validation ───────────────────────────────────────────

  async validateTicket(ticketCode: string) {
    const bookingSeat = await this.prisma.bookingSeat.findUnique({
      where: { ticketCode },
      include: {
        booking: {
          include: {
            user: { select: { name: true } },
            schedule: {
              include: {
                movie: { select: { title: true } },
                studio: {
                  select: { name: true, cinema: { select: { name: true } } },
                },
              },
            },
          },
        },
        scheduleSeat: {
          include: {
            seat: { select: { rowLabel: true, seatNumber: true, type: true } },
          },
        },
      },
    });

    if (!bookingSeat) {
      return { valid: false, message: 'Tiket tidak ditemukan' };
    }

    if (bookingSeat.booking.status !== 'CONFIRMED') {
      return {
        valid: false,
        message: `Tiket tidak valid — status: ${bookingSeat.booking.status}`,
      };
    }

    const showTime = bookingSeat.booking.schedule.showTime;
    const twoHoursAfter = new Date(showTime.getTime() + 2 * 60 * 60 * 1000);

    if (new Date() > twoHoursAfter) {
      return { valid: false, message: 'Tiket sudah kadaluarsa' };
    }

    return {
      valid: true,
      message: 'Tiket valid ✅',
      data: {
        ticketCode: bookingSeat.ticketCode,
        customerName: bookingSeat.booking.user.name,
        movieTitle: bookingSeat.booking.schedule.movie.title,
        cinema: bookingSeat.booking.schedule.studio.cinema.name,
        studio: bookingSeat.booking.schedule.studio.name,
        seat: `${bookingSeat.scheduleSeat.seat.rowLabel}${bookingSeat.scheduleSeat.seat.seatNumber}`,
        seatType: bookingSeat.scheduleSeat.seat.type,
        showTime: bookingSeat.booking.schedule.showTime,
        bookingCode: bookingSeat.booking.bookingCode,
      },
    };
  }

  // ─── User Management ─────────────────────────────────────────────

  async getUsers(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { bookings: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async toggleUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, email: true, isActive: true },
    });

    this.logger.log(`User ${userId} status → ${updated.isActive ? 'active' : 'inactive'}`);
    return updated;
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private async findCinemaOrThrow(id: string) {
    const cinema = await this.prisma.cinema.findUnique({ where: { id } });
    if (!cinema) throw new NotFoundException('Bioskop tidak ditemukan');
    return cinema;
  }
}