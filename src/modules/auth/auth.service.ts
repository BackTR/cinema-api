import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 hari dalam detik

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Cek email sudah terdaftar
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Buat user baru
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
      },
    });

    this.logger.log(`New user registered: ${user.email}`);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Cari user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Pesan error sengaja dibuat sama untuk mencegah user enumeration
    const invalidMsg = 'Email atau password tidak valid';
    if (!user) throw new UnauthorizedException(invalidMsg);

    // Verifikasi password
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException(invalidMsg);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokenPair> {
    // Verifikasi refresh token ada di Redis
    const storedToken = await this.redis.client.get(`refresh_token:${userId}`);
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token tidak valid atau sudah expired');
    }

    // Bandingkan token (hash comparison)
    const isMatch = await bcrypt.compare(refreshToken, storedToken);
    if (!isMatch) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    // Ambil data user
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    // Rotate refresh token — token lama langsung invalid
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    // Hapus refresh token dari Redis
    await this.redis.client.del(`refresh_token:${userId}`);
    this.logger.log(`User logged out: ${userId}`);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async generateTokens(userId: string, email: string, role: string): Promise<TokenPair> {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    // Simpan hashed refresh token di Redis — bukan plain token
    const hashed = await bcrypt.hash(refreshToken, this.BCRYPT_ROUNDS);
    await this.redis.client.setex(`refresh_token:${userId}`, this.REFRESH_TOKEN_TTL, hashed);
  }
}
