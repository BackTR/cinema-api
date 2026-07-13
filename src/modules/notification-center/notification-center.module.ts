import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { NotificationCenterController } from './notification-center.controller';
import { NotificationCenterService } from './notification-center.service';
import { SseService } from './sse.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    JwtModule.register({}),
  ],
  controllers: [NotificationCenterController],
  providers: [NotificationCenterService, SseService],
  exports: [NotificationCenterService, SseService], // ← pastikan keduanya di-export
})
export class NotificationCenterModule {}