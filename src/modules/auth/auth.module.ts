// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WhatsappService } from './whatsapp.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), NotificationModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    WhatsappService,
    GoogleStrategy,
    FacebookStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
