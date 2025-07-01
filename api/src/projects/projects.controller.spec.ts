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
import { PoliciesGuard } from '../casl/policies.guard';
import { TasksService } from '../tasks/tasks.service';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let knex: Knex;
  let createdProjectId: number;

  const mockUser = {
    id: crypto.randomUUID(),
    email: 'e2e-test@example.com',
    name: 'E2E Test User',
  };

  const mockTasksService = {
    getUserRoleForTask: jest.fn().mockResolvedValue('owner'),
  };
  
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        KnexModule,
      ],
      controllers: [ProjectsController],
      providers: [
        // ### ИЗМЕНЕНИЕ: Добавляем все нужные провайдеры
        ProjectsService,
        PoliciesGuard,
        { provide: TasksService, useValue: mockTasksService },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockUser;
        return true;
      },
    })
    // ### ИЗМЕНЕНИЕ: Мокируем PoliciesGuard, чтобы не проверять реальную логику прав в e2e тестах контроллера
    .overrideGuard(PoliciesGuard)
    .useValue({ canActivate: () => true })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    
    knex = app.get(KNEX_CONNECTION);
    await knex('project_members').del();
    await knex('tasks').del();
    await knex('columns').del();
    await knex('projects').del();
    await knex('users').where('email', mockUser.email).del();
    await knex('users').insert({ ...mockUser, password_hash: 'test-hash' });
  });

  afterAll(async () => {
    if (knex) {
      await knex.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  it('POST /api/v1/projects - should create a new project', async () => {
    const createProjectDto = { name: 'E2E Project', prefix: 'E2E' };
    
    const response = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send(createProjectDto)
      .expect(201);

    expect(response.body.name).toEqual(createProjectDto.name);
    expect(response.body.owner_id).toEqual(mockUser.id);
    createdProjectId = response.body.id;
  });

  it('GET /api/v1/projects/:id - should get the created project details', async () => {
    expect(createdProjectId).toBeDefined();

    const response = await request(app.getHttpServer())
      .get(`/api/v1/projects/${createdProjectId}`)
      .expect(200);

    expect(response.body.id).toEqual(createdProjectId);
    expect(response.body.owner.id).toEqual(mockUser.id);
    expect(response.body.columns).toHaveLength(3);
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