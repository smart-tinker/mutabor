import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';
import { Role } from '../casl/roles.enum';

const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'user' };

describe('ProjectsService', () => {
  let service: ProjectsService;
  let knex;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { 
          provide: KNEX_CONNECTION, 
          useValue: jest.fn(),
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    knex = module.get(KNEX_CONNECTION);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserRoleForProject', () => {
    it('should return Role.Owner if user is the owner', async () => {
      const mockFirst = jest.fn().mockResolvedValue({ owner_id: 'user-1' });
      knex.mockReturnValue({ where: () => ({ first: mockFirst }) });
      const role = await service.getUserRoleForProject(1, 'user-1');
      expect(role).toBe(Role.Owner);
    });

    it('should return member role if user is a member', async () => {
      const mockFirst = jest.fn()
        .mockResolvedValueOnce({ owner_id: 'owner-id' })
        .mockResolvedValueOnce({ role: Role.Editor });
      knex.mockReturnValue({ where: () => ({ first: mockFirst }) });
      const role = await service.getUserRoleForProject(1, 'user-2');
      expect(role).toBe(Role.Editor);
    });
  });

  describe('createProject', () => {
    it('should create a project with default columns and types within a transaction', async () => {
      const dto = { name: 'New Project', prefix: 'NEW' };
      const newProjectRecord = { id: 1, ...dto };

      const mockReturning = jest.fn().mockResolvedValue([newProjectRecord]);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockTrx = jest.fn(() => ({ insert: mockInsert }));
      knex.transaction = jest.fn().mockImplementation(async (callback) => callback(mockTrx));

      await service.createProject(dto, mockUser);

      expect(knex.transaction).toHaveBeenCalled();
      expect(mockTrx).toHaveBeenCalledWith('projects');
    });
  });
  
  describe('deleteColumn', () => {
    let mockTrx;
    let mockUpdate;
    let mockDelete;
    let mockOrderBy;

    beforeEach(() => {
        mockUpdate = jest.fn().mockResolvedValue(1);
        mockDelete = jest.fn().mockResolvedValue(1);
        mockOrderBy = jest.fn();

        // Этот мок теперь правильно имитирует и .where(...).update(...) и .where(...).delete()
        const mockWhereChain = {
          orderBy: mockOrderBy,
          delete: mockDelete,
          update: mockUpdate,
        };

        mockTrx = jest.fn(() => ({
          where: jest.fn(() => mockWhereChain),
        }));
        
        knex.transaction = jest.fn().mockImplementation(async (callback) => callback(mockTrx));
    });

    it('should throw BadRequestException if trying to delete the last column', async () => {
        mockOrderBy.mockResolvedValue([{ id: 'col1' }]);
        await expect(service.deleteColumn(1, 'col1')).rejects.toThrow(BadRequestException);
    });

    it('should move tasks and delete column', async () => {
        const columns = [{ id: 'col1', position: 0 }, { id: 'col2', position: 1 }];
        mockOrderBy.mockResolvedValue(columns);

        await service.deleteColumn(1, 'col1');

        // Проверяем, что был вызов для перемещения задач в `col2`
        expect(mockTrx).toHaveBeenCalledWith('tasks');
        expect(mockUpdate).toHaveBeenCalledWith({ column_id: 'col2' });

        // Проверяем, что был вызов удаления для `col1`
        expect(mockTrx).toHaveBeenCalledWith('columns');
        expect(mockDelete).toHaveBeenCalled();

        // Проверяем, что был вызов для обновления позиции `col2`
        expect(mockUpdate).toHaveBeenCalledWith({ position: 0 });
    });
  });
});