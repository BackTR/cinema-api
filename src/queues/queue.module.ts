import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BookingExpireProcessor } from './booking-expire.processor';
import { BookingService } from '../modules/booking/booking.service';
import { SeatLockService } from '../modules/booking/seat-lock.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: config.getOrThrow<number>('REDIS_PORT'),
          password: config.getOrThrow<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'booking' }),
  ],
  providers: [BookingExpireProcessor, BookingService, SeatLockService],
  exports: [BullModule],
})
export class QueueModule {}