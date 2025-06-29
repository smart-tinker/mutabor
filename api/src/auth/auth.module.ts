// api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { ProfileController } from './profile.controller';

@Module({
  imports: [
    ConfigModule, // ### ДОБАВЛЕНО: Убедимся, что ConfigService доступен здесь
    PassportModule.register({ session: false }),
    JwtModule.register({}), 
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, ProfileController], 
  exports: [AuthService],
})
export class AuthModule {}