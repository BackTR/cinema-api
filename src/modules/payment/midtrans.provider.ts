import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Midtrans from 'midtrans-client';

export const MIDTRANS_CLIENT = 'MIDTRANS_CLIENT';

export const MidtransProvider: Provider = {
  provide: MIDTRANS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Midtrans.Snap => {
    return new Midtrans.Snap({
      isProduction: config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: config.getOrThrow<string>('MIDTRANS_SERVER_KEY'),
      clientKey: config.getOrThrow<string>('MIDTRANS_CLIENT_KEY'),
    });
  },
};