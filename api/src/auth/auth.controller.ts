import { Controller, Post, Body, HttpCode, UseGuards, Get, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  // ### ИЗМЕНЕНИЕ: Эндпоинты, связанные с профилем, удалены отсюда ###
  // Они переехали в ProfileController для лучшей организации кода.

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout() {
    // For stateless JWT, server-side logout primarily relies on client clearing the token.
    return { message: 'Logged out successfully' };
  }
}