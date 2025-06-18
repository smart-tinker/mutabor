import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // <-- ИМПОРТИРОВАТЬ

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Включаем глобальную валидацию для всех входящих DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Автоматически удаляет свойства, которых нет в DTO
      forbidNonWhitelisted: true, // Выбрасывает ошибку, если есть лишние свойства
      transform: true, // Автоматически преобразует типы (например, string из URL в number)
    }),
  );

  await app.listen(3001);
}
bootstrap();