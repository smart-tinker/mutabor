// api/src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator'; // ### НОВОЕ: Импортируем декоратор

@ApiExcludeController()
@Controller()
export class AppController {
  constructor() {} 

  @Public() // ### НОВОЕ: Помечаем эндпоинт как публичный
  @Get('/health')
  getHealth(): { status: string; message: string } {
    return { status: 'ok', message: 'API is healthy' };
  }
}