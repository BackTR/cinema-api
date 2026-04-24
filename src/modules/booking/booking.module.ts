import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { SeatLockService } from './seat-lock.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'booking' }),
  ],
  controllers: [BookingController],
  providers: [BookingService, SeatLockService],
  exports: [BookingService, SeatLockService],
})
export class BookingModule {}