import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { ProjectRecord } from '../types/db-records';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';

const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@example.com', name: 'Test User' };

// ### ИЗМЕНЕНИЕ: Умный мок, который возвращает переданные данные ###
const projectsTrxMock = {
  insert: jest.fn().mockImplementation((data) => ({
    returning: jest.fn().mockResolvedValue([{
      id: 1,
      last_task_number: 0,
      owner_id: mockUser.id,
      created_at: new Date(),
      updated_at: new Date(),
      ...data, // Динамически добавляем данные из insert
    }]),
  })),
};

// Мок для вставок, которые ничего не возвращают (колонки, типы)
const otherTrxMock = {
  insert: jest.fn().mockResolvedValue(undefined),
};

const trxMock = jest.fn()
  .mockImplementation((tableName) => {
    // В зависимости от таблицы возвращаем разный мок
    if (tableName === 'projects') {
      return projectsTrxMock;
    }
    return otherTrxMock;
  });

const queryBuilderMock = {
    where: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    first: jest.fn(),
    orderBy: jest.fn(),
};

const mockKnex = jest.fn(() => queryBuilderMock) as jest.Mock & { transaction: jest.Mock };
mockKnex.transaction = jest.fn().mockImplementation(async (callback) => callback(trxMock));


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
      
      expect(project.name).toBe(createDto.name); // Теперь этот тест должен пройти
      expect(mockKnex.transaction).toHaveBeenCalled();
      expect(trxMock).toHaveBeenCalledWith('projects');
      expect(trxMock).toHaveBeenCalledWith('columns');
      expect(trxMock).toHaveBeenCalledWith('project_task_types');
      expect(projectsTrxMock.insert).toHaveBeenCalledTimes(1);
      expect(otherTrxMock.insert).toHaveBeenCalledTimes(2);
    });
  });
});