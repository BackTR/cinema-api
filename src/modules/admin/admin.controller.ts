import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateCinemaSchema, CreateCinemaDto } from './dto/create-cinema.dto';
import { CreateStudioSchema, CreateStudioDto } from './dto/create-studio.dto';
import { CreateSeatsSchema, CreateSeatsDto } from './dto/create-seat.dto';
import { QueryBookingSchema, QueryBookingDto } from './dto/query-booking.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ─── Cinema ──────────────────────────────────────────────────────
  @Get('cinemas')
  async getCinemas() {
    return this.adminService.getCinemas();
  }

  @Post('cinemas')
  @HttpCode(HttpStatus.CREATED)
  async createCinema(
    @Body(new ZodValidationPipe(CreateCinemaSchema)) dto: CreateCinemaDto,
  ) {
    return this.adminService.createCinema(dto);
  }

  @Patch('cinemas/:id')
  async updateCinema(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateCinemaSchema.partial())) dto: Partial<CreateCinemaDto>,
  ) {
    return this.adminService.updateCinema(id, dto);
  }

  @Delete('cinemas/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCinema(@Param('id') id: string) {
    return this.adminService.deleteCinema(id);
  }

  // ─── Studio ──────────────────────────────────────────────────────
  @Get('cinemas/:cinemaId/studios')
  async getStudios(@Param('cinemaId') cinemaId: string) {
    return this.adminService.getStudios(cinemaId);
  }

  @Post('studios')
  @HttpCode(HttpStatus.CREATED)
  async createStudio(
    @Body(new ZodValidationPipe(CreateStudioSchema)) dto: CreateStudioDto,
  ) {
    return this.adminService.createStudio(dto);
  }

  // ─── Seats ───────────────────────────────────────────────────────
  @Get('studios/:studioId/seats')
  async getSeats(@Param('studioId') studioId: string) {
    return this.adminService.getSeats(studioId);
  }

  @Post('seats')
  @HttpCode(HttpStatus.CREATED)
  async createSeats(
    @Body(new ZodValidationPipe(CreateSeatsSchema)) dto: CreateSeatsDto,
  ) {
    return this.adminService.createSeats(dto);
  }

  // ─── Bookings ────────────────────────────────────────────────────
  @Get('bookings')
  async getAllBookings(
    @Query(new ZodValidationPipe(QueryBookingSchema)) query: QueryBookingDto,
  ) {
    return this.adminService.getAllBookings(query);
  }

  // ─── Ticket Validation ───────────────────────────────────────────
  @Get('tickets/validate/:ticketCode')
  async validateTicket(@Param('ticketCode') ticketCode: string) {
    return this.adminService.validateTicket(ticketCode);
  }

  // ─── Users ───────────────────────────────────────────────────────
  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      search,
    );
  }

  @Patch('users/:id/toggle-status')
  async toggleUserStatus(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id);
  }
}