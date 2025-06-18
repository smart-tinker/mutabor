import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {} // No AppService needed for a simple health check

  @Get('/health')
  getHealth(): { status: string; message: string } {
    return { status: 'ok', message: 'API is healthy' };
  }
}
