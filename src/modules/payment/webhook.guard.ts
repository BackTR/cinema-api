import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Request } from 'express';

@Injectable()
export class MidtransWebhookGuard implements CanActivate {
  private readonly logger = new Logger(MidtransWebhookGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const body = req.body as Record<string, string>;

    // Midtrans signature: SHA512(orderId + statusCode + grossAmount + serverKey)
    const serverKey = this.config.getOrThrow<string>('MIDTRANS_SERVER_KEY');
    const expected = createHash('sha512')
      .update(
        `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`,
      )
      .digest('hex');

    if (expected !== body.signature_key) {
      this.logger.warn(
        `Invalid webhook signature from IP: ${req.ip} — order: ${body.order_id}`,
      );
      throw new ForbiddenException('Invalid webhook signature');
    }

    return true;
  }
}