import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationService } from '../modules/notification/notification.service';

interface GenerateTicketJob {
  bookingCode: string;
}

@Processor('ticket')
export class GenerateTicketProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerateTicketProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<GenerateTicketJob>): Promise<void> {
    const { bookingCode } = job.data;

    if (!bookingCode) {
      this.logger.warn(`Skipping job ${job.id} — bookingCode is missing`);
      return;
    }

    this.logger.debug(`Generating ticket for booking: ${bookingCode}`);

    try {
      await this.notificationService.sendBookingConfirmation(bookingCode);
      this.logger.log(`Ticket generated and email sent for: ${bookingCode}`);
    } catch (error) {
      this.logger.error(`Failed to generate ticket for ${bookingCode}:`, error);
      throw error;
    }
  }
}
