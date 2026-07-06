// src/modules/notification-center/notification-center.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { NotificationCenterController } from './notification-center.controller';
import { NotificationCenterService } from './notification-center.service';
import { SseService } from './sse.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    JwtModule.register({}), // ← tambah, config dari env langsung
  ],
  controllers: [NotificationCenterController],
  providers: [NotificationCenterService, SseService],
  exports: [NotificationCenterService],
})
export class NotificationCenterModule {}