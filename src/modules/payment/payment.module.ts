import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MidtransProvider } from './midtrans.provider';
import { BookingModule } from '../booking/booking.module';
import { BullModule } from '@nestjs/bullmq';
<<<<<<< HEAD
import { SchedulesModule } from '@modules/schedules/schedules.module';
=======
import { SchedulesModule } from '../schedules/schedules.module';
>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3

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
