import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule

describe('AppController', () => {
  let app: INestApplication;
  let appController: AppController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })], // Add ConfigModule here
      controllers: [AppController],
      // No providers needed if AppController has no direct service dependencies for /health
    }).compile();

    appController = moduleFixture.get<AppController>(AppController);

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('getHealth', () => {
    it('should return a health status object', () => {
      expect(appController.getHealth()).toEqual({
        status: 'ok',
        message: 'API is healthy',
      });
    });

    it('should return 200 OK for GET /health', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        message: 'API is healthy',
      });
    });
  });
});
