import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketService } from '../ticket/ticket.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ticketService: TicketService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: this.config.getOrThrow<string>('SENDGRID_API_KEY'),
      },
    });
  }

  async sendBookingConfirmation(bookingCode: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        user: { select: { name: true, email: true } },
        schedule: {
          include: {
            movie: { select: { title: true } },
            studio: { include: { cinema: { select: { name: true } } } },
          },
        },
        seats: {
          include: {
            scheduleSeat: {
              include: {
                seat: { select: { rowLabel: true, seatNumber: true } },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      this.logger.warn(`Booking not found for notification: ${bookingCode}`);
      return;
    }

    // Generate PDF
    const pdfBuffer = await this.ticketService.generateTicketPdf(bookingCode);

    const seatList = booking.seats
      .map((s) => `${s.scheduleSeat.seat.rowLabel}${s.scheduleSeat.seat.seatNumber}`)
      .join(', ');

    const showTime = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(booking.schedule.showTime);

    await this.transporter.sendMail({
      from: `"${this.config.get('MAIL_FROM_NAME', 'Cinema App')}" <${this.config.get('MAIL_FROM')}>`,
      to: booking.user.email,
      subject: `✅ Konfirmasi Booking ${bookingCode} — ${booking.schedule.movie.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">🎬 Cinema App</h1>
            <p style="margin: 5px 0 0;">Booking Dikonfirmasi!</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Halo <strong>${booking.user.name}</strong>,</p>
            <p>Pembayaran Anda telah berhasil! Berikut detail booking Anda:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; color: #666;">Kode Booking</td>
                <td style="padding: 10px; font-weight: bold;">${booking.bookingCode}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; color: #666;">Film</td>
                <td style="padding: 10px; font-weight: bold;">${booking.schedule.movie.title}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; color: #666;">Bioskop</td>
                <td style="padding: 10px;">${booking.schedule.studio.cinema.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; color: #666;">Studio</td>
                <td style="padding: 10px;">${booking.schedule.studio.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; color: #666;">Waktu Tayang</td>
                <td style="padding: 10px;">${showTime}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; color: #666;">Kursi</td>
                <td style="padding: 10px;">${seatList}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #666;">Total</td>
                <td style="padding: 10px; font-weight: bold; color: #1a1a2e;">
                  Rp ${Number(booking.totalAmount).toLocaleString('id-ID')}
                </td>
              </tr>
            </table>
            <p style="color: #666; font-size: 14px;">
              E-Ticket terlampir dalam email ini. Tunjukkan QR code kepada petugas bioskop saat masuk.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Terima kasih telah menggunakan Cinema App!
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `eticket-${bookingCode}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    this.logger.log(`Confirmation email sent to ${booking.user.email} for booking ${bookingCode}`);
  }
}
