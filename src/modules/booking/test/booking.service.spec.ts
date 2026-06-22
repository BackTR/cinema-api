// src/modules/booking/tests/booking.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from '../booking.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SeatLockService } from '../seat-lock.service';
import { SeatMapService } from '../../schedules/seat-map.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
    schedule: { findFirst: jest.fn() },
    scheduleSeat: { findMany: jest.fn(), updateMany: jest.fn() },
    booking: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    },
    $transaction: jest.fn(),
};

const mockSeatLock = {
    lockSeats: jest.fn(),
    releaseSeats: jest.fn(),
};

const mockSeatMapService = {
    invalidateSeatMap: jest.fn(),
};

const mockQueue = {
    add: jest.fn(),
};

describe('BookingService', () => {
    let service: BookingService;

    beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
        BookingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SeatLockService, useValue: mockSeatLock },
        { provide: SeatMapService, useValue: mockSeatMapService },
        { provide: getQueueToken('booking'), useValue: mockQueue },
        ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('createBooking', () => {
    it('should throw NotFoundException if schedule not found', async () => {
        mockPrisma.schedule.findFirst.mockResolvedValue(null);

        await expect(
            service.createBooking('user-1', {
            scheduleId: 'schedule-1',
            scheduleSeatIds: ['seat-1'],
        }),
    ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if seat lock fails', async () => {
        mockPrisma.schedule.findFirst.mockResolvedValue({
        id: 'schedule-1',
        showTime: new Date(Date.now() + 86400000),
        basePrice: 50000,
        pricingRules: [],
        movie: { title: 'Test' },
        studio: { name: 'Studio 1' },
    });
        mockSeatLock.lockSeats.mockResolvedValue(false);

        await expect(
        service.createBooking('user-1', {
            scheduleId: 'schedule-1',
            scheduleSeatIds: ['seat-1'],
        }),
    ).rejects.toThrow(ConflictException);
    });
});

    describe('expireBooking', () => {
    it('should skip if booking is not PENDING', async () => {
        mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: 'CONFIRMED',
        userId: 'user-1',
    });

        await service.expireBooking('booking-1', ['seat-1']);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should expire booking and release seats', async () => {
        mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: 'PENDING',
        userId: 'user-1',
    });
    mockPrisma.$transaction.mockResolvedValue(undefined);
    mockSeatLock.releaseSeats.mockResolvedValue(undefined);

    await service.expireBooking('booking-1', ['seat-1']);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockSeatLock.releaseSeats).toHaveBeenCalledWith(['seat-1'], 'user-1');
    });
});
});