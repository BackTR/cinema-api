import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { SeatMapService } from './seat-map.service';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, SeatMapService],
  exports: [SchedulesService, SeatMapService],
})
export class SchedulesModule {}
