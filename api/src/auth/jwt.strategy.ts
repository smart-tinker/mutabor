import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  email: string;
  sub: string; // User ID
  name: string;
}

// ### ИЗМЕНЕНИЕ: Определяем тип пользователя, который будет в объекте request.user ###
export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // ### ИЗМЕНЕНИЕ: Метод validate теперь возвращает объект с полем 'id' вместо 'sub' ###
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Мы преобразуем поле 'sub' из JWT в 'id' для консистентности внутри приложения.
    return { id: payload.sub, email: payload.email, name: payload.name };
  }
}