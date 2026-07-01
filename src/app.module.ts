// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { MoviesModule } from './modules/movies/movies.module';
import { SchedulesModule } from './modules/schedules/schedules.module'; // ← fix path
import { BookingModule } from './modules/booking/booking.module';
import { PaymentModule } from './modules/payment/payment.module';
import { TicketModule } from './modules/ticket/ticket.module'; // ← fix path
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { QueueModule } from './queues/queue.module';
<<<<<<< HEAD
import { PaymentModule } from '@modules/payment/payment.module';
import { TicketModule } from '@modules/ticket/ticket.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { AdminModule } from '@modules/admin/admin.module';
import { APP_GUARD } from '@nestjs/core';
=======
>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    BookingModule,
    PaymentModule,
    TicketModule,
    NotificationModule,
    AdminModule,
    HealthModule,
    QueueModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
<<<<<<< HEAD
    }
=======
    },
>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3
  ],
})
export class AppModule {}
