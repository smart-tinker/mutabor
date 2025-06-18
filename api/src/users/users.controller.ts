import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Этот "Guard" будет запускать нашу JwtStrategy для проверки токена
  // Если токен невалидный, запрос будет автоматически отклонен с ошибкой 401.
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: Request) {
    // Если мы дошли до этого места, значит токен валиден,
    // и Passport.js добавил объект пользователя в `req.user`.
    return req.user;
  }
}