import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FonnteResponse {
  status: boolean;
  reason?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  async sendOtp(phone: string, otp: string): Promise<void> {
    const token = this.config.getOrThrow<string>('FONNTE_TOKEN');
    const target = this.normalizePhone(phone);

    const message = `Kode OTP Cinema App Anda: *${otp}*\n\nJangan bagikan kode ini ke siapapun. Berlaku 5 menit.`;

    try {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ target, message, countryCode: '62' }),
      });

      const result = (await response.json()) as FonnteResponse;

      if (!response.ok || result.status === false) {
        this.logger.error(`Fonnte error: ${JSON.stringify(result)}`);
        throw new Error('Gagal mengirim OTP via WhatsApp');
      }

      this.logger.log(`OTP WhatsApp terkirim ke ${target}`);
    } catch (error) {
      this.logger.error(`Gagal kirim OTP ke ${phone}:`, error);
      throw error;
    }
  }

  // Normalisasi: 08xx -> 628xx, +628xx -> 628xx
  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
    if (!cleaned.startsWith('62')) cleaned = '62' + cleaned;
    return cleaned;
  }
}
