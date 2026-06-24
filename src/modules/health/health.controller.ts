// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck, HealthCheckService,
    MemoryHealthIndicator, DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisService } from '../../redis/redis.service';

@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly prismaHealth: PrismaHealthIndicator,
        private readonly memory: MemoryHealthIndicator,
        private readonly disk: DiskHealthIndicator,
        private readonly redis: RedisService,
    ) {}

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
        // Database
        () => this.prismaHealth.isHealthy('database'),

        // Redis
        async () => {
            try {
            await this.redis.client.ping();
            return { redis: { status: 'up' } };
            } catch {
            return { redis: { status: 'down' } };
            }
        },

        // Memory — max 512MB
        () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),

        // Disk — min 10% free
        () =>
            this.disk.checkStorage('storage', {
            path: '/',
            thresholdPercent: 0.9,
            }),
        ]);
    }
}