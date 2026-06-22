// src/modules/booking/tests/seat-lock.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SeatLockService } from '../seat-lock.service';
import { RedisService } from '../../../redis/redis.service';

const mockRedis = {
    client: {
        eval: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
    },
};

describe('SeatLockService', () => {
    let service: SeatLockService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
        providers: [
            SeatLockService,
            { provide: RedisService, useValue: mockRedis },
        ],
        }).compile();

        service = module.get<SeatLockService>(SeatLockService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('lockSeats', () => {
        it('should return true when all seats locked successfully', async () => {
        mockRedis.client.eval.mockResolvedValue(1);
        const result = await service.lockSeats(['seat-1', 'seat-2'], 'user-1');
        expect(result).toBe(true);
        expect(mockRedis.client.eval).toHaveBeenCalledTimes(1);
        });

    it('should return false when one seat already locked', async () => {
        mockRedis.client.eval.mockResolvedValue(0);
        const result = await service.lockSeats(['seat-1', 'seat-2'], 'user-1');
        expect(result).toBe(false);
        });
    });

    describe('releaseSeats', () => {
        it('should call eval with correct keys', async () => {
        mockRedis.client.eval.mockResolvedValue(1);
        await service.releaseSeats(['seat-1', 'seat-2'], 'user-1');
        expect(mockRedis.client.eval).toHaveBeenCalledTimes(1);
        });
    });

    describe('isLocked', () => {
        it('should return true when seat is locked', async () => {
        mockRedis.client.exists.mockResolvedValue(1);
        const result = await service.isLocked('seat-1');
        expect(result).toBe(true);
        });

        it('should return false when seat is not locked', async () => {
        mockRedis.client.exists.mockResolvedValue(0);
        const result = await service.isLocked('seat-1');
        expect(result).toBe(false);
        });
    });
    });