import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('FACEBOOK_APP_ID'),
      clientSecret: config.getOrThrow<string>('FACEBOOK_APP_SECRET'),
      callbackURL: config.getOrThrow<string>('FACEBOOK_CALLBACK_URL'),
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      scope: ['email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user: unknown) => void,
  ): void {
    done(null, {
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    });
  }
}
