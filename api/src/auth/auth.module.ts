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
    PassportModule.register({ session: false }),
    // Мы убираем registerAsync, так как стратегия теперь сама будет выбирать ключ
    JwtModule.register({}), 
    ConfigModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, ProfileController], 
  exports: [AuthService],
})
export class AuthModule {}