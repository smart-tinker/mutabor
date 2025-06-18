import { Controller, Post, Body, HttpCode, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
// Define a simple type for UserPayload for clarity, or import from a shared types file if available
type UserPayload = { id: string; email: string; name: string; };


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@GetUser() user: UserPayload) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile/email')
  getProfileEmail(@GetUser('email') email: string) {
    return { email };
  }
}
