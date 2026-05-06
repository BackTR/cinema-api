import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { QrService } from './qr.service';

export interface TicketData {
  bookingCode: string;
  movieTitle: string;
  cinemaName: string;
  studioName: string;
  showTime: Date;
  seats: { rowLabel: string; seatNumber: number; type: string; ticketCode: string }[];
  customerName: string;
  totalAmount: number;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private readonly qrService: QrService) {}

  async generateTicketPdf(data: TicketData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `E-Ticket ${data.bookingCode}`,
            Author: 'Cinema App',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // ─── Header ───────────────────────────────────────────────
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#1a1a2e')
          .text('🎬 CINEMA APP', { align: 'center' });

        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#666666')
          .text('E-Ticket Resmi', { align: 'center' });

        doc.moveDown();

        // Garis pemisah
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').lineWidth(1).stroke();

        doc.moveDown();

        // ─── Booking Info ─────────────────────────────────────────
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .fillColor('#1a1a2e')
          .text(data.movieTitle, { align: 'center' });

        doc.moveDown(0.5);

        // Info grid
        const infoY = doc.y;
        doc.fontSize(11).font('Helvetica').fillColor('#333333');

        this.drawInfoRow(doc, 'Kode Booking', data.bookingCode, infoY);
        this.drawInfoRow(doc, 'Bioskop', data.cinemaName, infoY + 25);
        this.drawInfoRow(doc, 'Studio', data.studioName, infoY + 50);
        this.drawInfoRow(doc, 'Waktu Tayang', this.formatDate(data.showTime), infoY + 75);
        this.drawInfoRow(doc, 'Nama', data.customerName, infoY + 100);

        doc.y = infoY + 130;
        doc.moveDown();

        // ─── Seats ────────────────────────────────────────────────
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').lineWidth(1).stroke();

        doc.moveDown(0.5);
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('Detail Kursi');

        doc.moveDown(0.5);

        // Header tabel
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#666666');
        doc.text('Kursi', 50, doc.y, { width: 100 });
        doc.text('Tipe', 150, doc.y - 12, { width: 100 });
        doc.text('Kode Tiket', 250, doc.y - 12, { width: 200 });

        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').stroke();
        doc.moveDown(0.3);

        // Rows
        for (const seat of data.seats) {
          const rowY = doc.y;
          doc.fontSize(11).font('Helvetica').fillColor('#333333');
          doc.text(`${seat.rowLabel}${seat.seatNumber}`, 50, rowY, { width: 100 });
          doc.text(seat.type, 150, rowY, { width: 100 });
          doc.text(seat.ticketCode, 250, rowY, { width: 200 });
          doc.moveDown(0.5);
        }

        doc.moveDown();

        // ─── Total ────────────────────────────────────────────────
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').stroke();

        doc.moveDown(0.5);
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#1a1a2e')
          .text(`Total: ${this.formatCurrency(data.totalAmount)}`, { align: 'right' });

        doc.moveDown();

        // ─── QR Codes per tiket ───────────────────────────────────
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').stroke();

        doc.moveDown(0.5);
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('QR Code Tiket');

        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text('Tunjukkan QR code ini kepada petugas bioskop.');

        doc.moveDown();

        // Generate QR per seat
        let qrX = 50;
        for (const seat of data.seats) {
          const qrData = JSON.stringify({
            ticketCode: seat.ticketCode,
            bookingCode: data.bookingCode,
            seat: `${seat.rowLabel}${seat.seatNumber}`,
          });

          const qrBase64 = await this.qrService.generateBase64(qrData);
          const qrImageData = qrBase64.replace('data:image/png;base64,', '');
          const qrBuffer = Buffer.from(qrImageData, 'base64');

          if (qrX + 120 > 545) {
            qrX = 50;
            doc.moveDown(7);
          }

          const qrY = doc.y;
          doc.image(qrBuffer, qrX, qrY, { width: 100, height: 100 });
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#333333')
            .text(`${seat.rowLabel}${seat.seatNumber}`, qrX, qrY + 105, {
              width: 100,
              align: 'center',
            });

          qrX += 130;
        }

        doc.moveDown(8);

        // ─── Footer ───────────────────────────────────────────────
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').stroke();

        doc.moveDown(0.5);
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#999999')
          .text(
            'Tiket ini adalah bukti pembelian yang sah. Harap tunjukkan kepada petugas bioskop.',
            { align: 'center' },
          );
        doc
          .fontSize(9)
          .fillColor('#999999')
          .text('Dilarang memperbanyak atau memindahtangankan tiket ini.', {
            align: 'center',
          });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private drawInfoRow(doc: PDFKit.PDFDocument, label: string, value: string, y: number): void {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#666666').text(label, 50, y, { width: 150 });
    doc.fontSize(11).font('Helvetica').fillColor('#333333').text(value, 200, y, { width: 345 });
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(date);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
