import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
// ### ИЗМЕНЕНИЕ: Убран префикс контроллера. ###
@Controller()
export class AppController {
  constructor() {} 

  @Get('/health')
  getHealth(): { status: string; message: string } {
    return { status: 'ok', message: 'API is healthy' };
  }
}