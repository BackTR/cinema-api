import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SeatLockService } from './seat-lock.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BookingStatus, Prisma, Role } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { nanoid } from 'nanoid';
<<<<<<< HEAD
import { SeatMapService } from '@modules/schedules/seat-map.service';
=======
import { SeatMapService } from '../schedules/seat-map.service';
>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3

const BOOKING_EXPIRY_MINUTES = 10;

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seatLock: SeatLockService,
    private readonly seatMapService: SeatMapService,
    @InjectQueue('booking') private readonly bookingQueue: Queue,
  ) {}

  async createBooking(userId: string, dto: CreateBookingDto) {
    const { scheduleId, scheduleSeatIds } = dto;

    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, isActive: true },
      include: {
        movie: { select: { title: true } },
        studio: { select: { name: true } },
        pricingRules: { where: { isActive: true } },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Jadwal tidak ditemukan atau sudah tidak aktif');
    }

    if (schedule.showTime < new Date()) {
      throw new BadRequestException('Tidak bisa memesan tiket untuk jadwal yang sudah lewat');
    }

    const locked = await this.seatLock.lockSeats(scheduleSeatIds, userId);
    if (!locked) {
      throw new ConflictException(
        'Satu atau lebih kursi sedang dipilih orang lain. Silakan pilih kursi lain.',
      );
    }

    let booking: Awaited<ReturnType<typeof this.prisma.booking.create>> | null = null;

    try {
      booking = await this.prisma.$transaction(async (tx) => {
        // Double-check status seat di DB
        const seats = await tx.scheduleSeat.findMany({
          where: {
            id: { in: scheduleSeatIds },
            scheduleId,
          },
          include: {
            seat: { select: { rowLabel: true, seatNumber: true, type: true } },
          },
        });

        if (seats.length !== scheduleSeatIds.length) {
          throw new BadRequestException('Beberapa kursi tidak valid untuk jadwal ini');
        }

        const unavailableSeats = seats.filter((s) => s.status !== 'AVAILABLE');
        if (unavailableSeats.length > 0) {
          const seatLabels = unavailableSeats
            .map((s) => `${s.seat.rowLabel}${s.seat.seatNumber}`)
            .join(', ');
          throw new ConflictException(`Kursi ${seatLabels} sudah tidak tersedia`);
        }

        const expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);
        let totalAmount = new Prisma.Decimal(0);

        const bookingSeatData = seats.map((scheduleSeat) => {
          // Fix: prioritaskan rule spesifik (seatType match) sebelum fallback (null)
          const specificRule = schedule.pricingRules.find(
            (r) => r.seatType === scheduleSeat.seat.type,
          );
          const fallbackRule = schedule.pricingRules.find((r) => r.seatType === null);
          const price = specificRule?.price ?? fallbackRule?.price ?? schedule.basePrice;

          totalAmount = totalAmount.add(price);

          return {
            scheduleSeatId: scheduleSeat.id,
            price,
            ticketCode: `TKT-${nanoid(10).toUpperCase()}`,
          };
        });

        const newBooking = await tx.booking.create({
          data: {
            userId,
            scheduleId,
            bookingCode: `BK-${nanoid(8).toUpperCase()}`,
            status: BookingStatus.PENDING,
            totalAmount,
            expiresAt,
            seats: { create: bookingSeatData },
          },
          include: {
            seats: {
              include: {
                scheduleSeat: {
                  include: {
                    seat: { select: { rowLabel: true, seatNumber: true, type: true } },
                  },
                },
              },
            },
          },
        });

        // Update schedule_seats → LOCKED di dalam transaction
        await tx.scheduleSeat.updateMany({
          where: { id: { in: scheduleSeatIds } },
          data: {
            status: 'LOCKED',
            lockedBy: userId,
            lockedUntil: expiresAt,
          },
        });

        this.logger.log(
          `Booking created: ${newBooking.bookingCode} by user ${userId} ` +
            `for ${seats.length} seat(s) — expires at ${expiresAt.toISOString()}`,
        );

        return newBooking;
      });

      // Invalidate seat map cache
      await this.seatMapService.invalidateSeatMap(scheduleId);
<<<<<<< HEAD
      
=======

>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3
      // Dispatch expire job SETELAH transaction sukses — bookingId sudah ada
      await this.bookingQueue.add(
        'expire-booking',
        {
          bookingId: booking.id, // ← fix: kirim bookingId yang benar
          scheduleSeatIds,
        },
        {
          delay: BOOKING_EXPIRY_MINUTES * 60 * 1000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      return booking;
    } catch (error) {
      // Release lock jika ada error
      await this.seatLock.releaseSeats(scheduleSeatIds, userId);
      throw error;
    }
  }

  async findMyBookings(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          schedule: {
            include: {
              movie: { select: { title: true, posterUrl: true, durationMinutes: true } },
              studio: { select: { name: true, cinema: { select: { name: true, city: true } } } },
            },
          },
          seats: {
            include: {
              scheduleSeat: {
                include: { seat: { select: { rowLabel: true, seatNumber: true, type: true } } },
              },
            },
          },
          payment: { select: { status: true, paidAt: true, gateway: true } },
        },
      }),
      this.prisma.booking.count({ where: { userId } }),
    ]);

    return {
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(bookingCode: string, userId: string, role?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        schedule: {
          include: {
            movie: true,
            studio: { include: { cinema: true } },
          },
        },
        seats: {
          include: {
            scheduleSeat: {
              include: { seat: true },
            },
          },
        },
        payment: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking tidak ditemukan');

    // Ownership check — user hanya boleh lihat booking sendiri
    // Admin boleh lihat semua
    if (role !== 'ADMIN' && booking.userId !== userId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke booking ini');
    }

    return booking;
  }

  async cancelBooking(bookingCode: string, userId: string, dto: CancelBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        seats: { select: { scheduleSeat: { select: { id: true } } } },
        schedule: { select: { showTime: true, id: true } },
        payment: { select: { status: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking tidak ditemukan');
    if (booking.userId !== userId) throw new ForbiddenException('Akses ditolak');

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException(
        `Booking dengan status ${booking.status} tidak bisa dibatalkan`,
      );
    }

    // Fix poin 4: tolak cancel CONFIRMED jika sudah PAID tanpa refund
    if (booking.status === 'CONFIRMED' && booking.payment?.status === 'PAID') {
      throw new BadRequestException(
        'Booking yang sudah dibayar tidak bisa dibatalkan langsung. ' +
          'Hubungi customer service untuk proses refund.',
      );
    }

    const oneHourBeforeShow = new Date(booking.schedule.showTime.getTime() - 60 * 60 * 1000);
    if (new Date() > oneHourBeforeShow) {
      throw new BadRequestException(
        'Tidak bisa membatalkan booking kurang dari 1 jam sebelum tayang',
      );
    }

    const scheduleSeatIds = booking.seats.map((s) => s.scheduleSeat.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { bookingCode },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: dto.reason ?? 'Dibatalkan oleh pengguna',
        },
      });

      await tx.scheduleSeat.updateMany({
        where: { id: { in: scheduleSeatIds } },
        data: { status: 'AVAILABLE', lockedBy: null, lockedUntil: null },
      });
    });
    
    await this.seatMapService.invalidateSeatMap(booking.scheduleId);

    await this.seatLock.releaseSeats(scheduleSeatIds, userId);
    await this.seatMapService.invalidateSeatMap(booking.schedule.id);

    this.logger.log(`Booking cancelled: ${bookingCode} by user ${userId}`);
    return { message: 'Booking berhasil dibatalkan' };
  }

  // Dipanggil oleh BullMQ processor saat booking expired
  async expireBooking(bookingId: string, scheduleSeatIds: string[]): Promise<void> {
  const booking = await this.prisma.booking.findUnique({
    where: { id: bookingId },
  });

<<<<<<< HEAD
  // Guard — hanya expire jika masih PENDING
  if (!booking || booking.status !== BookingStatus.PENDING) {
    this.logger.debug(`Booking ${bookingId} skip expire — status: ${booking?.status}`);
    return;
=======
    // Guard — hanya expire jika masih PENDING
    if (!booking || booking.status !== BookingStatus.PENDING) {
      this.logger.debug(`Booking ${bookingId} skip expire — status: ${booking?.status}`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.EXPIRED,
          expiredAt: new Date(),
        },
      });

      await tx.scheduleSeat.updateMany({
        where: { id: { in: scheduleSeatIds } },
        data: { status: 'AVAILABLE', lockedBy: null, lockedUntil: null },
      });
    });

    // ← Fix poin 1: release Redis lock setelah expire
    await this.seatLock.releaseSeats(scheduleSeatIds, booking.userId);

    this.logger.log(`Booking expired: ${bookingId} — seats released`);
>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3
  }

  await this.prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.EXPIRED,
        expiredAt: new Date(),
      },
    });

    await tx.scheduleSeat.updateMany({
      where: { id: { in: scheduleSeatIds } },
      data: { status: 'AVAILABLE', lockedBy: null, lockedUntil: null },
    });
  });

  // ← Fix poin 1: release Redis lock setelah expire
  await this.seatLock.releaseSeats(scheduleSeatIds, booking.userId);

  this.logger.log(`Booking expired: ${bookingId} — seats released`);
}
}
