import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { SeatLockService } from './seat-lock.service';
<<<<<<< HEAD
import { TicketModule } from '@modules/ticket/ticket.module';
import { SchedulesModule } from '@modules/schedules/schedules.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'booking' }),
    TicketModule,
    SchedulesModule,
  ],
=======
import { TicketModule } from '../ticket/ticket.module';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'booking' }), TicketModule, SchedulesModule],
>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3
  controllers: [BookingController],
  providers: [BookingService, SeatLockService],
  exports: [BookingService, SeatLockService],
})
export class BookingModule {}
