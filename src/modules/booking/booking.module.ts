import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { SeatLockService } from './seat-lock.service';
import { TicketModule } from '../ticket/ticket.module';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'booking' }), TicketModule, SchedulesModule],
  controllers: [BookingController],
  providers: [BookingService, SeatLockService],
  exports: [BookingService, SeatLockService],
})
export class BookingModule {}
