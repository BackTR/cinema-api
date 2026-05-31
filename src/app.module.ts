import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { MoviesModule } from './modules/movies/movies.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { BookingModule } from './modules/booking/booking.module';
import { QueueModule } from './queues/queue.module';
import { PaymentModule } from '@modules/payment/payment.module';
import { TicketModule } from '@modules/ticket/ticket.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { AdminModule } from '@modules/admin/admin.module';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // BullMQ global connection
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

    PrismaModule,
    RedisModule,
    AuthModule,
    MoviesModule,
    SchedulesModule,
    TicketModule,
    NotificationModule,
    BookingModule,
    PaymentModule,
    AdminModule,
    QueueModule,
  ],
  providers:[
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ]
})
export class AppModule {}
