// src/modules/payment/payment.service.ts
import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { MIDTRANS_CLIENT } from './midtrans.provider';
import * as Midtrans from 'midtrans-client';
import { Prisma } from '@prisma/client';

export interface MidtransNotification {
  order_id: string;
  transaction_status: string;
  fraud_status: string;
  payment_type: string;
  gross_amount: string;
  signature_key: string;
  status_code: string;
  transaction_id: string;
  transaction_time: string;
}

interface SnapResponse {
  token: string;
  redirect_url: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(MIDTRANS_CLIENT) private readonly midtrans: Midtrans.Snap,
  ) {}

  async initiatePayment(bookingCode: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        schedule: {
          include: {
            movie: { select: { title: true } },
            studio: { select: { name: true, cinema: { select: { name: true } } } },
          },
        },
        seats: {
          include: {
            scheduleSeat: {
              include: { seat: { select: { rowLabel: true, seatNumber: true } } },
            },
          },
        },
        payment: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking tidak ditemukan');
    if (booking.userId !== userId) throw new BadRequestException('Akses ditolak');

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Booking dengan status ${booking.status} tidak bisa diproses pembayaran`,
      );
    }

    if (new Date() > booking.expiresAt) {
      throw new BadRequestException('Booking sudah expired. Silakan buat booking baru.');
    }

    // Idempotent — kembalikan token lama jika payment PENDING sudah ada
    if (booking.payment && booking.payment.status === PaymentStatus.PENDING) {
      const existingResponse = booking.payment.gatewayResponse as SnapResponse | null;
      return {
        token: existingResponse?.token,
        redirectUrl: existingResponse?.redirect_url,
        bookingCode: booking.bookingCode,
        totalAmount: booking.totalAmount,
      };
    }

    const orderId = `ORDER-${booking.bookingCode}`;

    // Buat Midtrans Snap transaction — tanpa item_details karena type issue
    const transactionParams = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Number(booking.totalAmount),
      },
      customer_details: {
        first_name: booking.user.name,
        email: booking.user.email,
        phone: booking.user.phone ?? '',
      },
      expiry: {
        unit: 'minutes',
        duration: 10,
      },
    };

    const snapRaw = await this.midtrans.createTransaction(transactionParams);

    // Cast ke unknown dulu untuk menghindari strict type conflict
    const snapResponse = snapRaw;
    const gatewayJson = snapRaw as unknown as Prisma.InputJsonValue;

    await this.prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        gatewayRef: orderId,
        gatewayResponse: gatewayJson,
        status: PaymentStatus.PENDING,
        expiredAt: booking.expiresAt,
      },
      create: {
        bookingId: booking.id,
        gatewayRef: orderId,
        gateway: 'MIDTRANS',
        status: PaymentStatus.PENDING,
        amount: booking.totalAmount,
        gatewayResponse: gatewayJson,
        expiredAt: booking.expiresAt,
      },
    });

    this.logger.log(`Payment initiated: ${orderId} — amount: ${booking.totalAmount}`);

    return {
      token: snapResponse.token,
      redirectUrl: snapResponse.redirect_url,
      bookingCode: booking.bookingCode,
      totalAmount: booking.totalAmount,
    };
  }

  async handleWebhook(notification: MidtransNotification): Promise<void> {
    const { order_id, transaction_status, fraud_status } = notification;

    const payment = await this.prisma.payment.findFirst({
      where: { gatewayRef: order_id },
      include: {
        booking: {
          include: {
            seats: {
              select: { scheduleSeat: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`Webhook received for unknown order: ${order_id}`);
      return;
    }

    // Idempotent — skip jika sudah final
    const finalStatuses: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.REFUNDED];
    if (finalStatuses.includes(payment.status)) {
      this.logger.debug(`Payment ${order_id} already in final state: ${payment.status}`);
      return;
    }

    const bookingCode = order_id.replace('ORDER-', '');

    const isSuccess =
      (transaction_status === 'capture' && fraud_status === 'accept') ||
      transaction_status === 'settlement';

    const isFailed =
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire';

    if (isSuccess) {
      await this.handlePaymentSuccess(payment.booking, bookingCode);
    } else if (isFailed) {
      await this.handlePaymentFailed(payment.booking, bookingCode);
    } else {
      this.logger.log(`Payment pending: ${order_id}`);
    }
  }

  private async handlePaymentSuccess(
    booking: { id: string; seats: { scheduleSeat: { id: string } }[] },
    bookingCode: string,
  ): Promise<void> {
    const scheduleSeatIds = booking.seats.map((s) => s.scheduleSeat.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CONFIRMED },
      });

      await tx.payment.update({
        where: { bookingId: booking.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });

      await tx.scheduleSeat.updateMany({
        where: { id: { in: scheduleSeatIds } },
        data: { status: 'BOOKED', lockedBy: null, lockedUntil: null },
      });
    });

    this.logger.log(`Payment SUCCESS: booking ${bookingCode} CONFIRMED`);
  }

  private async handlePaymentFailed(
    booking: { id: string; seats: { scheduleSeat: { id: string } }[] },
    bookingCode: string,
  ): Promise<void> {
    const scheduleSeatIds = booking.seats.map((s) => s.scheduleSeat.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'Pembayaran gagal atau dibatalkan',
        },
      });

      await tx.payment.update({
        where: { bookingId: booking.id },
        data: { status: PaymentStatus.FAILED },
      });

      await tx.scheduleSeat.updateMany({
        where: { id: { in: scheduleSeatIds } },
        data: { status: 'AVAILABLE', lockedBy: null, lockedUntil: null },
      });
    });

    this.logger.log(`Payment FAILED: booking ${bookingCode} CANCELLED`);
  }
}
