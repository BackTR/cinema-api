import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RegisterSchema, RegisterDto } from './dto/register.dto';
import { LoginSchema, LoginDto } from './dto/login.dto';
import { RequestPhoneOtpSchema, RequestPhoneOtpDto } from './dto/request-phone-otp.dto';
import { VerifyPhoneOtpSchema, VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { VerifyEmailSchema, VerifyEmailDto } from './dto/verify-email.dto';
import {
  ResendEmailVerificationSchema,
  ResendEmailVerificationDto,
} from './dto/resend-email-verification.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CheckPhoneSchema } from './dto/check-phone.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  // ─── Email + Password ──────────────────────────────────────────
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ─── Email Verification ─────────────────────────────────────────
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body(new ZodValidationPipe(VerifyEmailSchema)) dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('email/resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendEmailVerification(
    @Body(new ZodValidationPipe(ResendEmailVerificationSchema)) dto: ResendEmailVerificationDto,
  ) {
    return this.authService.resendEmailVerification(dto.email);
  }

  // ─── Phone + WhatsApp OTP ────────────────────────────────────────
  @Post('phone/request-otp')
  @HttpCode(HttpStatus.OK)
  async requestPhoneOtp(
    @Body(new ZodValidationPipe(RequestPhoneOtpSchema)) dto: RequestPhoneOtpDto,
  ) {
    return this.authService.requestPhoneOtp(dto);
  }

  @Post('phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneOtp(@Body(new ZodValidationPipe(VerifyPhoneOtpSchema)) dto: VerifyPhoneOtpDto) {
    return this.authService.verifyPhoneOtp(dto);
  }

  @Get('phone/check')
  async checkPhone(@Query(new ZodValidationPipe(CheckPhoneSchema)) query: { phone: string }) {
    return this.authService.checkPhoneExists(query.phone);
  }

  // ─── OAuth Google ─────────────────────────────────────────────────
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth(): void {
    // redirect ditangani Passport
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const profile = req.user as {
      providerId: string;
      email: string;
      name: string;
      avatarUrl?: string;
    };
    const authResponse = await this.authService.handleOAuthLogin('GOOGLE', profile);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${authResponse.accessToken}&refreshToken=${authResponse.refreshToken}`,
    );
  }

  // ─── OAuth Facebook ───────────────────────────────────────────────
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth(): void {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const profile = req.user as {
      providerId: string;
      email: string;
      name: string;
      avatarUrl?: string;
    };
    const authResponse = await this.authService.handleOAuthLogin('FACEBOOK', profile);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${authResponse.accessToken}&refreshToken=${authResponse.refreshToken}`,
    );
  }

  // ─── Refresh & Logout (existing) ────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  async refresh(@CurrentUser() user: JwtPayload & { refreshToken: string }) {
    return this.authService.refreshToken(user.sub, user.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sub);
    return { message: 'Logout berhasil' };
  }
}
