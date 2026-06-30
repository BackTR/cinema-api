import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

const LOCK_TTL_SECONDS = 600; // 10 menit

// Atomic multi-seat lock menggunakan Lua script
// Jika salah satu kursi sudah locked → semua gagal, tidak ada partial lock
const LOCK_SCRIPT = `
  for i = 1, #KEYS do
    if redis.call('EXISTS', KEYS[i]) == 1 then
      return 0
    end
  end
  for i = 1, #KEYS do
    redis.call('SETEX', KEYS[i], ARGV[1], ARGV[2])
  end
  return 1
`;

const RELEASE_SCRIPT = `
  for i = 1, #KEYS do
    if redis.call('GET', KEYS[i]) == ARGV[1] then
      redis.call('DEL', KEYS[i])
    end
  end
  return 1
`;

@Injectable()
export class SeatLockService {
  private readonly logger = new Logger(SeatLockService.name);

  constructor(private readonly redis: RedisService) {}

  async lockSeats(scheduleSeatIds: string[], userId: string): Promise<boolean> {
    const keys = scheduleSeatIds.map((id) => `seat_lock:${id}`);

    const result = (await this.redis.client.eval(
      LOCK_SCRIPT,
      keys.length,
      ...keys,
      String(LOCK_TTL_SECONDS),
      userId,
    )) as number;

    if (result === 1) {
      this.logger.debug(`Seats locked for user ${userId}: ${scheduleSeatIds.join(', ')}`);
    }

    return result === 1;
  }

  // Release hanya jika lock milik user yang sama (mencegah release lock orang lain)
  async releaseSeats(scheduleSeatIds: string[], userId: string): Promise<void> {
    const keys = scheduleSeatIds.map((id) => `seat_lock:${id}`);

    await this.redis.client.eval(RELEASE_SCRIPT, keys.length, ...keys, userId);

    this.logger.debug(`Seats released for user ${userId}: ${scheduleSeatIds.join(', ')}`);
  }

  async isLocked(scheduleSeatId: string): Promise<boolean> {
    const result = await this.redis.client.exists(`seat_lock:${scheduleSeatId}`);
    return result === 1;
  }
}
