import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Глобальный фильтр исключений для стандартизации ответов об ошибках
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Глобальный пайп для валидации всех входящих DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    }
  }));

  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000', // Используем переменную окружения
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ### ИЗМЕНЕНИЕ: Глобальный префикс убран. ###
  // Префиксы теперь заданы в каждом контроллере для явности.
  // app.setGlobalPrefix('api/v1');

  // Настройка Swagger для документирования API
  const config = new DocumentBuilder()
    .setTitle('Mutabor API')
    .setDescription('The official API for the Mutabor project management tool.')
    .setVersion('1.0')
    .addBearerAuth()
    // Swagger будет отображать пути с префиксами, заданными в контроллерах.
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // ### ИЗМЕНЕНИЕ: Путь к Swagger изменен для соответствия префиксам API ###
  const swaggerPath = 'api/v1/api-docs';
  SwaggerModule.setup(swaggerPath, app, document);
  
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  
  const appUrl = await app.getUrl();
  console.log(`Application is running on: ${appUrl}`);
  console.log(`Swagger documentation is available at: ${appUrl}/${swaggerPath}`);
}
bootstrap();