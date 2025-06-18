import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto'; // <-- ИМПОРТИРОВАТЬ

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ... метод register остается без изменений ...
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  // ОБНОВЛЕННЫЙ ЭНДПОИНТ
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) { // <-- ИСПОЛЬЗОВАТЬ LoginDto
    return this.authService.login(loginDto);
  }
}