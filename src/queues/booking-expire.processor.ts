import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { BookingService } from '../modules/booking/booking.service';

interface ExpireBookingJob {
  bookingId: string;
  scheduleSeatIds: string[];
}

@Processor('booking')
export class BookingExpireProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpireProcessor.name);

  constructor(private readonly bookingService: BookingService) {
    super();
  }

  async process(job: Job<ExpireBookingJob>): Promise<void> {
    const { bookingId, scheduleSeatIds } = job.data;

    // Guard: skip job lama yang tidak punya bookingId
    if (!bookingId) {
      this.logger.warn(`Skipping job ${job.id} — bookingId is missing`);
      return;
    }

    this.logger.debug(`Processing expire job for booking: ${bookingId}`);

    try {
      await this.bookingService.expireBooking(bookingId, scheduleSeatIds);
    } catch (error) {
      this.logger.error(`Failed to expire booking ${bookingId}:`, error);
      throw error;
    }
  }
}
