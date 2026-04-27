import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService, TicketData } from './pdf.service';
import { QrService } from './qr.service';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly qrService: QrService,
  ) {}

  async generateTicketPdf(bookingCode: string): Promise<Buffer> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        user: { select: { name: true, email: true } },
        schedule: {
          include: {
            movie: { select: { title: true } },
            studio: {
              include: { cinema: { select: { name: true } } },
            },
          },
        },
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

    if (!booking) throw new NotFoundException('Booking tidak ditemukan');

    const ticketData: TicketData = {
      bookingCode: booking.bookingCode,
      movieTitle: booking.schedule.movie.title,
      cinemaName: booking.schedule.studio.cinema.name,
      studioName: booking.schedule.studio.name,
      showTime: booking.schedule.showTime,
      customerName: booking.user.name,
      totalAmount: Number(booking.totalAmount),
      seats: booking.seats.map((bs) => ({
        rowLabel: bs.scheduleSeat.seat.rowLabel,
        seatNumber: bs.scheduleSeat.seat.seatNumber,
        type: bs.scheduleSeat.seat.type,
        ticketCode: bs.ticketCode,
      })),
    };

    this.logger.log(`Generating PDF ticket for booking: ${bookingCode}`);
    return this.pdfService.generateTicketPdf(ticketData);
  }

  async getTicketQr(ticketCode: string): Promise<string> {
    const bookingSeat = await this.prisma.bookingSeat.findUnique({
      where: { ticketCode },
      include: {
        booking: { select: { bookingCode: true, status: true } },
        scheduleSeat: {
          include: {
            seat: { select: { rowLabel: true, seatNumber: true } },
          },
        },
      },
    });

    if (!bookingSeat) throw new NotFoundException('Tiket tidak ditemukan');

    const qrData = JSON.stringify({
      ticketCode: bookingSeat.ticketCode,
      bookingCode: bookingSeat.booking.bookingCode,
      seat: `${bookingSeat.scheduleSeat.seat.rowLabel}${bookingSeat.scheduleSeat.seat.seatNumber}`,
      status: bookingSeat.booking.status,
    });

    return this.qrService.generateBase64(qrData);
  }
}
