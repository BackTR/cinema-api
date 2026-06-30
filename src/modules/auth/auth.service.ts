import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WhatsappService } from './whatsapp.service';
import { NotificationService } from '../notification/notification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPhoneOtpDto } from './dto/request-phone-otp.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { User, AuthProvider } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
const OTP_TTL_SECONDS = 300;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly whatsapp: WhatsappService,
    private readonly notification: NotificationService,
  ) {}

  // ─── Email + Password ──────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: 'CUSTOMER',
        emailVerified: false,
      },
    });

    await this.sendEmailVerification(user.id, user.email!, user.name);

    this.logger.log(`User registered via email: ${dto.email}`);
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email atau password tidak valid');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Email atau password tidak valid');

    if (!user.isActive) throw new UnauthorizedException('Akun Anda telah dinonaktifkan');

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Email belum diverifikasi. Periksa inbox Anda atau minta kode verifikasi baru.',
      );
    }

    return this.buildAuthResponse(user);
  }

  // ─── Email Verification ─────────────────────────────────────────

  async sendEmailVerification(userId: string, email: string, name: string): Promise<void> {
    const cooldownKey = `email_verify:${userId}:cooldown`;
    const onCooldown = await this.redis.client.get(cooldownKey);
    if (onCooldown) {
      throw new BadRequestException('Tunggu sebentar sebelum minta kode verifikasi baru');
    }

    const code = this.generateOtp();
    await this.redis.client.setex(`email_verify:${userId}`, EMAIL_VERIFY_TTL_SECONDS, code);
    await this.redis.client.setex(cooldownKey, OTP_COOLDOWN_SECONDS, '1');

    await this.notification.sendEmailVerificationCode(email, name, code);
  }

  async resendEmailVerification(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Email tidak ditemukan');
    if (user.emailVerified) throw new BadRequestException('Email sudah terverifikasi');

    await this.sendEmailVerification(user.id, email, user.name);
    return { message: 'Kode verifikasi baru telah dikirim ke email Anda' };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('Email tidak ditemukan');

    const storedCode = await this.redis.client.get(`email_verify:${user.id}`);
    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException('Kode verifikasi salah atau sudah expired');
    }

    await this.redis.client.del(`email_verify:${user.id}`);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });

    this.logger.log(`Email verified: ${dto.email}`);
    return this.buildAuthResponse(updated);
  }

  // ─── Phone + WhatsApp OTP ────────────────────────────────────────

  async requestPhoneOtp(dto: RequestPhoneOtpDto): Promise<{ message: string; isNewUser: boolean }> {
    const { phone, name } = dto;

    const cooldownKey = `otp:${phone}:cooldown`;
    const onCooldown = await this.redis.client.get(cooldownKey);
    if (onCooldown) {
      throw new BadRequestException('Tunggu sebentar sebelum minta OTP baru');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { phone } });

    if (existingUser && !existingUser.isActive) {
      throw new UnauthorizedException('Akun Anda telah dinonaktifkan');
    }

    if (!existingUser) {
      if (!name) {
        throw new BadRequestException('Nama wajib diisi untuk pendaftaran baru');
      }
      await this.redis.client.setex(`pending_register:${phone}`, OTP_TTL_SECONDS, name);
    }

    const otp = this.generateOtp();
    await this.redis.client.setex(`otp:${phone}`, OTP_TTL_SECONDS, otp);
    await this.redis.client.setex(cooldownKey, OTP_COOLDOWN_SECONDS, '1');
    await this.redis.client.del(`otp:${phone}:attempts`);

    await this.whatsapp.sendOtp(phone, otp);

    return {
      message: 'Kode OTP telah dikirim via WhatsApp',
      isNewUser: !existingUser,
    };
  }

  async verifyPhoneOtp(dto: VerifyPhoneOtpDto): Promise<AuthResponse> {
    const { phone, otp } = dto;

    const attemptsKey = `otp:${phone}:attempts`;
    const attempts = Number(await this.redis.client.get(attemptsKey)) || 0;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Terlalu banyak percobaan salah. Minta OTP baru.');
    }

    const storedOtp = await this.redis.client.get(`otp:${phone}`);
    if (!storedOtp || storedOtp !== otp) {
      await this.redis.client.incr(attemptsKey);
      await this.redis.client.expire(attemptsKey, OTP_TTL_SECONDS);
      throw new BadRequestException('Kode OTP salah atau sudah expired');
    }

    await this.redis.client.del(`otp:${phone}`);
    await this.redis.client.del(attemptsKey);

    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      const pendingName = await this.redis.client.get(`pending_register:${phone}`);
      if (!pendingName) {
        throw new BadRequestException('Sesi pendaftaran sudah expired, silakan mulai ulang');
      }

      user = await this.prisma.user.create({
        data: { name: pendingName, phone, phoneVerified: true, role: 'CUSTOMER' },
      });
      await this.redis.client.del(`pending_register:${phone}`);
      this.logger.log(`New user registered via phone: ${phone}`);
    } else {
      if (!user.isActive) throw new UnauthorizedException('Akun Anda telah dinonaktifkan');
      if (!user.phoneVerified) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { phoneVerified: true },
        });
      }
    }

    return this.buildAuthResponse(user);
  }

  // ─── OAuth (Google / Facebook) ───────────────────────────────────

  async handleOAuthLogin(
    provider: AuthProvider,
    profile: { providerId: string; email: string; name: string; avatarUrl?: string },
  ): Promise<AuthResponse> {
    let user = await this.prisma.user.findUnique({
      where: { providerId: profile.providerId },
    });

    if (!user) {
      const existingByEmail = profile.email
        ? await this.prisma.user.findUnique({ where: { email: profile.email } })
        : null;

      if (existingByEmail) {
        // Link OAuth ke akun yang sudah ada berdasarkan email
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            provider,
            providerId: profile.providerId,
            emailVerified: true,
            avatarUrl: existingByEmail.avatarUrl ?? profile.avatarUrl,
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            name: profile.name,
            email: profile.email || null,
            avatarUrl: profile.avatarUrl,
            provider,
            providerId: profile.providerId,
            emailVerified: true,
            role: 'CUSTOMER',
          },
        });
      }
      this.logger.log(`New user via ${provider}: ${profile.email}`);
    }

    if (!user.isActive) throw new UnauthorizedException('Akun Anda telah dinonaktifkan');

    return this.buildAuthResponse(user);
  }

  // ─── Token Management ────────────────────────────────────────────

  async refreshToken(userId: string, refreshToken: string): Promise<TokenPair> {
    const storedHash = await this.redis.client.get(`refresh_token:${userId}`);
    if (!storedHash) throw new UnauthorizedException('Refresh token tidak valid');

    const incomingHash = createHash('sha256').update(refreshToken).digest('hex');
    if (storedHash !== incomingHash) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User tidak valid');

    return this.generateTokenPair(user);
  }

  async logout(userId: string): Promise<void> {
    await this.redis.client.del(`refresh_token:${userId}`);
  }

  private async generateTokenPair(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const refreshHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.redis.client.setex(`refresh_token:${user.id}`, REFRESH_TTL_SECONDS, refreshHash);

    return { accessToken, refreshToken };
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const tokens = await this.generateTokenPair(user);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
      ...tokens,
    };
  }

  private generateOtp(): string {
    return String(randomInt(100000, 999999));
  }

  async getMe(userId: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedException('User tidak ditemukan');

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
  };
}
}
