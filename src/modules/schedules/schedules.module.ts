import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { SeatMapService } from './seat-map.service';

@Module({
  controllers: [SchedulesController],
  providers: [SchedulesService, SeatMapService],
  exports: [SchedulesService, SeatMapService],
})
export class SchedulesModule {}
