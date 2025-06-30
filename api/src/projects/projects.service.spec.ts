import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { ProjectRecord } from '../types/db-records';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';

const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@example.com', name: 'Test User' };
const mockProject: ProjectRecord = { id: 1, name: 'Test Project', task_prefix: 'TP', last_task_number: 0, owner_id: 'user-1', created_at: new Date(), updated_at: new Date() };

// ### ИЗМЕНЕНИЕ: Полный и корректный мок Knex и транзакции ###
const trxMock = {
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([mockProject]),
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn(),
  // Добавляем мок для вызова trx('table_name')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (tableName: string) {
    return this;
  },
};
const mockKnex = {
  transaction: jest.fn().mockImplementation(async (callback) => callback(trxMock)),
  // Добавляем методы, которые могут быть вызваны напрямую на this.knex
  where: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn(),
  orderBy: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (tableName: string) {
    return this;
  },
};


describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: KNEX_CONNECTION, useValue: mockKnex },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    it('should create a project with default columns and types within a transaction', async () => {
      const createDto = { name: 'New Test Project', prefix: 'NTP' };
      const project = await service.createProject(createDto, mockUser);
      
      expect(project.name).toBe(createDto.name);
      expect(mockKnex.transaction).toHaveBeenCalled();
      expect(trxMock.insert).toHaveBeenCalledTimes(3);
    });
  });
});