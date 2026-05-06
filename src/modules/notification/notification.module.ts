import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { TicketModule } from '../ticket/ticket.module';

@Module({
  imports: [TicketModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}