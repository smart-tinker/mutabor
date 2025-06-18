// Полный путь: mutabor/api/src/prisma/prisma.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Этот метод гарантирует, что мы успешно подключились к базе данных
    // при старте приложения.
    await this.$connect();
  }
}