// src/modules/payment/payment.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { PaymentService, MidtransNotification } from './payment.service';
import { MidtransWebhookGuard } from './webhook.guard';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { InitiatePaymentSchema, InitiatePaymentDto } from './dto/initiate-payment.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async initiate(
    @Body(new ZodValidationPipe(InitiatePaymentSchema)) dto: InitiatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.initiatePayment(dto.bookingCode, user.sub);
  }

  @Post('webhook/midtrans')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MidtransWebhookGuard)
  async webhookMidtrans(@Body() body: unknown): Promise<{ message: string }> {
    await this.paymentService.handleWebhook(body as MidtransNotification);
    return { message: 'OK' };
  }
}
