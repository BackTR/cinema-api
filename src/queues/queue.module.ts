// src/queues/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BookingExpireProcessor } from './booking-expire.processor';
import { GenerateTicketProcessor } from './generate-ticket.processor';
import { BookingModule } from '../modules/booking/booking.module';
import { NotificationModule } from '../modules/notification/notification.module';

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
    BullModule.registerQueue({ name: 'booking' }, { name: 'ticket' }),
    BookingModule,
    NotificationModule,
  ],
  providers: [BookingExpireProcessor, GenerateTicketProcessor],
  exports: [BullModule],
})
export class QueueModule {}
