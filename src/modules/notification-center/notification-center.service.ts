import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SseService } from './sse.service';
import { NotificationType, Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

interface CreateNotificationDto {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Prisma.InputJsonValue;
    }

    @Injectable()
    export class NotificationCenterService {
    private readonly logger = new Logger(NotificationCenterService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly sse: SseService,
    ) {}

    // Buat notifikasi baru + kirim real-time via SSE
    async create(dto: CreateNotificationDto) {
        const notification = await this.prisma.notification.create({
        data: {
            userId: dto.userId,
            type: dto.type,
            title: dto.title,
            message: dto.message,
            data: dto.data ?? Prisma.JsonNull,
        },
        });

        // Kirim real-time ke user
        this.sse.sendToUser(dto.userId, {
        type: 'notification',
        data: notification,
        });

        // Update unread count
        const unreadCount = await this.prisma.notification.count({
        where: { userId: dto.userId, isRead: false },
        });

        this.sse.sendToUser(dto.userId, {
        type: 'unread_count',
        data: { count: unreadCount },
        });

        return notification;
    }

    // Ambil notifikasi user dengan pagination
    async getUserNotifications(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await Promise.all([
        this.prisma.notification.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        this.prisma.notification.count({ where: { userId } }),
        this.prisma.notification.count({ where: { userId, isRead: false } }),
        ]);

        return {
        data: notifications,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        unreadCount,
        };
    }

    // Tandai semua sudah dibaca
    async markAllAsRead(userId: string) {
        await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
        });

        this.sse.sendToUser(userId, { type: 'unread_count', data: { count: 0 } });
        return { message: 'Semua notifikasi sudah dibaca' };
    }

    // Tandai 1 notifikasi sudah dibaca
    async markAsRead(notificationId: string, userId: string) {
        await this.prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
        });

        const unreadCount = await this.prisma.notification.count({
        where: { userId, isRead: false },
        });

        this.sse.sendToUser(userId, { type: 'unread_count', data: { count: unreadCount } });
        return { message: 'Notifikasi sudah dibaca' };
    }

    // Hapus notifikasi
    async deleteNotification(notificationId: string, userId: string) {
        await this.prisma.notification.deleteMany({
        where: { id: notificationId, userId },
        });
        return { message: 'Notifikasi dihapus' };
    }

    // Hapus semua notifikasi
    async clearAll(userId: string) {
        await this.prisma.notification.deleteMany({ where: { userId } });
        this.sse.sendToUser(userId, { type: 'unread_count', data: { count: 0 } });
        return { message: 'Semua notifikasi dihapus' };
    }

    // ─── Cron Jobs ───────────────────────────────────────────────────

    // Reminder 1 jam sebelum tayang — jalan setiap 15 menit
    @Cron('0 */15 * * * *')
    async sendShowtimeReminders() {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const oneHour15Later = new Date(now.getTime() + 75 * 60 * 1000);

        // Cari booking CONFIRMED yang jadwal tayangnya 1 jam dari sekarang
        const upcomingBookings = await this.prisma.booking.findMany({
        where: {
            status: 'CONFIRMED',
            schedule: {
            showTime: { gte: oneHourLater, lte: oneHour15Later },
            },
            // Belum dapat reminder (cek via notifikasi yang sudah ada)
            user: {
            notifications: {
                none: {
                type: 'REMINDER_1H',
                data: { path: ['bookingCode'], equals: undefined },
                createdAt: { gte: new Date(now.getTime() - 90 * 60 * 1000) },
                },
            },
            },
        },
        include: {
            user: { select: { id: true, name: true } },
            schedule: {
            include: {
                movie: { select: { title: true } },
                studio: { select: { cinema: { select: { name: true } } } },
            },
            },
        },
        });

        for (const booking of upcomingBookings) {
        await this.create({
            userId: booking.userId,
            type: 'REMINDER_1H',
            title: '🎬 Film Kamu Segera Tayang!',
            message: `${booking.schedule.movie.title} akan tayang 1 jam lagi di ${booking.schedule.studio.cinema.name}. Jangan sampai terlambat!`,
            data: {
            bookingCode: booking.bookingCode,
            movieTitle: booking.schedule.movie.title,
            showTime: booking.schedule.showTime.toISOString(),
            },
        });
        }

        if (upcomingBookings.length > 0) {
        this.logger.log(`Sent ${upcomingBookings.length} showtime reminder(s)`);
        }
    }

    // Review reminder — jalan setiap jam
    @Cron(CronExpression.EVERY_HOUR)
    async sendReviewReminders() {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        // Cari booking confirmed dengan jadwal yang baru selesai 2 hari lalu, belum ada review
        const eligible = await this.prisma.booking.findMany({
        where: {
            status: 'CONFIRMED',
            schedule: {
            showTime: { gte: threeDaysAgo, lte: twoDaysAgo },
            },
            user: {
            notifications: {
                none: {
                type: 'REVIEW_REMINDER',
                createdAt: { gte: threeDaysAgo },
                },
            },
            },
            // Belum ada review
            review: null,
        },
        include: {
            schedule: { include: { movie: { select: { id: true, title: true } } } },
        },
        take: 50,
        });

        for (const booking of eligible) {
        await this.create({
            userId: booking.userId,
            type: 'REVIEW_REMINDER',
            title: '⭐ Bagaimana Filmnya?',
            message: `Kamu baru saja menonton ${booking.schedule.movie.title}. Bagikan pengalamanmu dengan review!`,
            data: {
            movieId: booking.schedule.movie.id,
            movieTitle: booking.schedule.movie.title,
            bookingCode: booking.bookingCode,
            },
        });
        }
    }

    // Heartbeat SSE — jalan setiap 30 detik
    @Cron('*/30 * * * * *')
    sendHeartbeat() {
        this.sse.sendHeartbeat();
    }
}