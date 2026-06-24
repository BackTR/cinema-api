import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MidtransProvider } from './midtrans.provider';
import { BookingModule } from '../booking/booking.module';
import { BullModule } from '@nestjs/bullmq';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [
    BookingModule,
    SchedulesModule,
    BullModule.registerQueue({
      name: 'ticket',
    }),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, MidtransProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
