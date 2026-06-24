import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleSchema, CreateScheduleDto } from './dto/create-schedule.dto';
import { QueryScheduleSchema, QueryScheduleDto } from './dto/query-schedule.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, Schedule } from '@prisma/client';
import { SeatMapResult } from './seat-map.service';



interface PaginatedSchedules {
  data: Schedule[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  // Public
  @Get()
  async findAll(
    @Query(new ZodValidationPipe(QueryScheduleSchema)) query: QueryScheduleDto,
  ): Promise<PaginatedSchedules> {
    return this.schedulesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Schedule> {
    return this.schedulesService.findOne(id);
  }

  @Get(':id/seats')
  async getSeatMap(@Param('id') id: string): Promise<SeatMapResult> {
    return this.schedulesService.getSeatMap(id);
  }

  @Get(':id/pricing')
  async getPricingRules(@Param('id') id: string) {
    return this.schedulesService.getPricingRules(id);
  }

  @Get('cinemas')
  async getCinemas() {
    return this.schedulesService.getCinemas();
  }

  // Admin only
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(
    @Body(new ZodValidationPipe(CreateScheduleSchema)) dto: CreateScheduleDto,
  ): Promise<Schedule> {
    return this.schedulesService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deactivate(@Param('id') id: string): Promise<void> {
    await this.schedulesService.deactivate(id);
  }

  @Post(':id/pricing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createPricingRule(
    @Param('id') id: string,
    @Body() dto: { seatType: 'REGULAR' | 'VIP'; pricingType: string; price: number },
  ) {
    return this.schedulesService.createPricingRule(id, dto);
  }
}
