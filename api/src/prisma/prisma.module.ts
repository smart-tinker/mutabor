import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Экспортируем сервис, чтобы его можно было импортировать в других модулях
})
export class PrismaModule {}