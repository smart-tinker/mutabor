import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService) {
        const secret = process.env.JWT_SECRET; // Выносим в переменную
        if (!secret) {
          // Если секрета нет, приложение должно упасть с ошибкой при запуске
          throw new Error('JWT_SECRET is not set in the environment variables!');
        }
    
        super({
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          ignoreExpiration: false,
          secretOrKey: secret,
        });
  }

  // Этот метод вызывается Passport.js после успешной верификации токена.
  // Он получает "полезную нагрузку" (payload), которую мы зашифровали в токене.
  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден.');
    }

    // ИСПРАВЛЕНИЕ: Используем деструктуризацию вместо delete
    const { password_hash, ...result } = user;
    return result;
  }
}