// api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { ProfileController } from './profile.controller';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ session: false }),
    // ### ИЗМЕНЕНИЕ: Настраиваем JwtModule, чтобы он знал о секретном ключе ###
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' }, // Устанавливаем срок жизни токена
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, ProfileController], 
  exports: [AuthService],
})
export class AuthModule {}