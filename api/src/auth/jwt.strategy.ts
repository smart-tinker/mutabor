import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  email: string;
  sub: string; // User ID
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly keyMap: Map<number, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Мы не можем указать secretOrKey здесь, так как их может быть несколько
      // Вместо этого мы переопределим метод validate
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        // Эта функция просто извлекает токен, реальная валидация ниже
        done(null, rawJwtToken);
      },
    });
    
    this.keyMap = new Map();
    const keyPrefix = 'JWT_SECRET_V';
    let version = 1;
    while (this.configService.get<string>(`${keyPrefix}${version}`)) {
        this.keyMap.set(version, this.configService.get<string>(`${keyPrefix}${version}`));
        version++;
    }

    if (this.keyMap.size === 0) {
        throw new Error('No JWT_SECRET_V* environment variables found. At least JWT_SECRET_V1 is required.');
    }
  }

  async validate(rawJwtToken: any): Promise<JwtPayload> {
    let lastError: Error | null = null;

    // Пытаемся верифицировать токен каждым известным ключом
    for (const secret of this.keyMap.values()) {
        try {
            const payload: JwtPayload = await this.jwtService.verifyAsync(rawJwtToken, { secret });
            return { sub: payload.sub, email: payload.email, name: payload.name };
        } catch (e) {
            lastError = e;
        }
    }

    // Если ни один ключ не подошел, выбрасываем ошибку
    throw new UnauthorizedException('Invalid or expired token.', lastError.message);
  }
}