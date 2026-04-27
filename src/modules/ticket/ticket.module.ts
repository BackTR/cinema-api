import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { PdfService } from './pdf.service';
import { QrService } from './qr.service';

@Module({
  providers: [TicketService, PdfService, QrService],
  exports: [TicketService],
})
export class TicketModule {}
