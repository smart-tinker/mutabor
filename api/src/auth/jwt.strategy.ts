import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { Knex } from 'knex';

export interface JwtPayload {
  email: string;
  sub: string; // User ID
  name: string;
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user'; // ### НОВОЕ: Добавлена роль в объект пользователя
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    // ### НОВОЕ: Инжектируем Knex для получения роли
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // ### ИЗМЕНЕНИЕ: Метод validate теперь получает роль из БД и добавляет ее в объект пользователя
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.knex('users').where({ id: payload.sub }).select('role').first();
    const role = user ? user.role : 'user';

    return { 
      id: payload.sub, 
      email: payload.email, 
      name: payload.name,
      role: role,
    };
  }
}