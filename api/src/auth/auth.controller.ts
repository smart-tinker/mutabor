import { Controller, Post, Body, HttpCode, UseGuards, Get, HttpStatus } from '@nestjs/common'; // Added HttpStatus
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
  @HttpCode(HttpStatus.CREATED) // Added HttpCode
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

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout() {
    // For stateless JWT, server-side logout primarily relies on client clearing the token.
    // This endpoint is here for completeness and could be expanded if token blacklisting is implemented.
    return { message: 'Logged out successfully' };
  }
}
