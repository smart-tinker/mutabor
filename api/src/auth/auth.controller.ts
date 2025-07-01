// api/src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { Public } from './decorators/public.decorator'; // ### НОВОЕ: Импортируем декоратор

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public() // ### НОВОЕ: Помечаем эндпоинт как публичный
  @Post('login')
  @HttpCode(200)
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Public() // ### НОВОЕ: Помечаем эндпоинт как публичный
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  // Logout требует аутентификации, поэтому @Public() здесь не нужен
  @Post('logout')
  @HttpCode(200)
  async logout() {
    return { message: 'Logged out successfully' };
  }
}