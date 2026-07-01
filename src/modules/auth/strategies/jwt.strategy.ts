import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
<<<<<<< HEAD
      select: { id: true, isActive: true },
=======
      select: { id: true, isActive: true }, // ← tambah isActive
>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3
    });

    if (!user) throw new UnauthorizedException('User tidak ditemukan');

<<<<<<< HEAD
    //tolak user nonaktif
    if (!user.isActive){
      throw new UnauthorizedException('Akun anda telah Di nonaktifkan')
=======
    // ← Fix poin 8: tolak user nonaktif
    if (!user.isActive) {
      throw new UnauthorizedException('Akun Anda telah dinonaktifkan');
>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3
    }

    return payload;
  }
}
