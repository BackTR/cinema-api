// src/modules/notification-center/notification-center.controller.ts
import {
  Controller, Get, Patch, Delete, Param,
  Query, Res, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationCenterService } from './notification-center.service';
import { SseService } from './sse.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationCenterController {
  constructor(
    private readonly notifService: NotificationCenterService,
    private readonly sseService: SseService,
    private readonly jwtService: JwtService,       // ← tambah
    private readonly configService: ConfigService, // ← tambah
  ) {}

  // SSE — tidak pakai JwtAuthGuard, verifikasi manual via query token
  @Get('stream')
  async stream(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    // Verifikasi token
    let userId: string;
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      userId = payload.sub;
    } catch {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Register client
    this.sseService.addClient(userId, res);

    // Kirim unread count saat pertama connect
    const result = await this.notifService.getUserNotifications(userId, 1, 1);
    res.write(`event: unread_count\ndata: ${JSON.stringify({ count: result.unreadCount })}\n\n`);
  }

  // Endpoint lain — pakai JwtAuthGuard normal
  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifService.getUserNotifications(
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.notifService.markAllAsRead(user.sub);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notifService.markAsRead(id, user.sub);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async clearAll(@CurrentUser() user: JwtPayload) {
    return this.notifService.clearAll(user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deleteOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notifService.deleteNotification(id, user.sub);
  }
}