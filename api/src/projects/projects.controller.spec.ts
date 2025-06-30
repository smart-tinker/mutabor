import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { KnexModule } from '../knex/knex.module';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let knex: Knex;
  let createdProjectId: number;

  const mockUser = {
    id: crypto.randomUUID(), // ### ИЗМЕНЕНИЕ: Используем валидный UUID ###
    email: 'e2e-test@example.com',
    name: 'E2E Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        KnexModule,
        // Импортируем модули, от которых зависит ProjectsModule
      ],
      controllers: [ProjectsController],
      providers: [ProjectsService],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockUser;
        return true;
      },
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    
    knex = app.get(KNEX_CONNECTION);
    // Очистка и подготовка БД перед тестами
    await knex('project_members').del();
    await knex('tasks').del();
    await knex('columns').del();
    await knex('projects').del();
    await knex('users').where('email', mockUser.email).del();
    await knex('users').insert({ ...mockUser, password_hash: 'test-hash' });
  });

  afterAll(async () => {
    await knex.destroy();
    await app.close();
  });

  it('POST /api/v1/projects - should create a new project', async () => {
    const createProjectDto = { name: 'E2E Project', prefix: 'E2E' };
    
    const response = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send(createProjectDto)
      .expect(201);

    expect(response.body.name).toEqual(createProjectDto.name);
    expect(response.body.owner_id).toEqual(mockUser.id);
    createdProjectId = response.body.id; // Сохраняем для следующих тестов
  });

  it('GET /api/v1/projects/:id - should get the created project details', async () => {
    expect(createdProjectId).toBeDefined();

    const response = await request(app.getHttpServer())
      .get(`/api/v1/projects/${createdProjectId}`)
      .expect(200);

    expect(response.body.id).toEqual(createdProjectId);
    expect(response.body.owner.id).toEqual(mockUser.id);
    expect(response.body.columns).toHaveLength(3); // Проверяем колонки по умолчанию
  });

  it('GET /api/v1/projects - should list the created project for the user', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.some(p => p.id === createdProjectId)).toBe(true);
  });
});