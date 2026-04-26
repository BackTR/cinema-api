import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MidtransProvider } from './midtrans.provider';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [BookingModule],
  controllers: [PaymentController],
  providers: [PaymentService, MidtransProvider],
  exports: [PaymentService],
})
export class PaymentModule {}