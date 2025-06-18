import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'YOUR_VERY_SECRET_KEY', // TODO: use environment variable
    });
  }

  async validate(payload: any) {
    // The payload is expected to have sub, email, and name from the login service
    return { id: payload.sub, email: payload.email, name: payload.name };
  }
}
