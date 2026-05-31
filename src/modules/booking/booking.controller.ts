import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingSchema, CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingSchema, CancelBookingDto } from './dto/cancel-booking.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { TicketService } from '../ticket/ticket.service';
import { Response } from 'express';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly ticketService: TicketService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateBookingSchema)) dto: CreateBookingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingService.createBooking(user.sub, dto);
  }

  @Get()
  async findMyBookings(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingService.findMyBookings(
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }


@Get(':bookingCode/ticket')
async downloadTicket(
  @Param('bookingCode') bookingCode: string,
  @CurrentUser() user: JwtPayload,
  @Res() res: Response,
): Promise<void> {
  const booking = await this.bookingService.findOne(bookingCode, user.sub);

  // hanya booking CONFIRMED yang bisa download
  if (booking.status !== 'CONFIRMED') {
    res.status(400).json({
      success: false,
      message: `Tiket hanya tersedia untuk booking yang sudah dikonfirmasi. Status saat ini: ${booking.status}`,
    });
    return;
  }

  const pdfBuffer = await this.ticketService.generateTicketPdf(bookingCode);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="eticket-${bookingCode}.pdf"`);
  res.end(pdfBuffer);
}

 
  @Get(':bookingCode')
  async findOne(
    @Param('bookingCode') bookingCode: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingService.findOne(bookingCode, user.sub);
  }

  @Patch(':bookingCode/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('bookingCode') bookingCode: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CancelBookingSchema)) dto: CancelBookingDto,
  ) {
    return this.bookingService.cancelBooking(bookingCode, user.sub, dto);
  }
}