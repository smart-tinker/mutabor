// api/src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';

@ApiExcludeController()
@Controller()
export class AppController {
  constructor() {} 

  @Public()
  @Get('/health')
  getHealth(): { status: string; message: string } {
    return { status: 'ok', message: 'API is healthy' };
  }
}