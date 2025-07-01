import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';
import { Role } from '../casl/roles.enum';
import { AddMemberDto } from './dto/add-member.dto';

const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'user' };

describe('ProjectsService', () => {
  let service: ProjectsService;
  let knex; // Эта переменная будет хранить полный мок-объект с .transaction
  let knexFn; // Эта переменная будет хранить мок-функцию для вызовов knex('table')

  beforeEach(async () => {
    // ### ИЗМЕНЕНИЕ: Разделяем мок-функцию и мок-объект ###
    const mockMethods = {
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      raw: jest.fn(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      max: jest.fn().mockReturnThis(),
    };
    knexFn = jest.fn(() => mockMethods);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { 
          provide: KNEX_CONNECTION, 
          // Предоставляем объект, у которого есть метод transaction, а сам он является функцией
          useValue: Object.assign(knexFn, {
            transaction: jest.fn().mockImplementation(async (callback) => callback(knexFn)),
          }),
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    knex = module.get(KNEX_CONNECTION);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  describe('addMemberToProject', () => {
    const projectId = 1;
    const project = { id: projectId, owner_id: 'owner-id' };
    const userToAdd = { id: 'new-user-id', email: 'new@user.com', name: 'New User' };
    const addMemberDto: AddMemberDto = { email: userToAdd.email, role: Role.Editor };

    it('should successfully add a member', async () => {
      // ### ИЗМЕНЕНИЕ: Настраиваем моки через knexFn ###
      knexFn().first
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(userToAdd)
        .mockResolvedValueOnce(null);
      
      const newMemberRecord = { project_id: projectId, user_id: userToAdd.id, role: addMemberDto.role };
      knexFn().returning.mockResolvedValueOnce([newMemberRecord]);

      const result = await service.addMemberToProject(projectId, addMemberDto);
      
      expect(result.user).toEqual(expect.objectContaining({ id: userToAdd.id, email: userToAdd.email }));
      expect(result.role).toBe(Role.Editor);
      expect(knexFn).toHaveBeenCalledWith('projects');
      expect(knexFn).toHaveBeenCalledWith('users');
      expect(knexFn).toHaveBeenCalledWith('project_members');
    });

    it('should throw ConflictException if user is already a member', async () => {
      knexFn().first
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(userToAdd)
        .mockResolvedValueOnce({ user_id: userToAdd.id });

      await expect(service.addMemberToProject(projectId, addMemberDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if trying to add the project owner', async () => {
      const ownerAsUser = { id: project.owner_id, email: 'owner@email.com', name: 'Owner' };
      const ownerDto: AddMemberDto = { email: ownerAsUser.email, role: Role.Editor };
      
      knexFn().first
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(ownerAsUser);

      await expect(service.addMemberToProject(projectId, ownerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user to add does not exist', async () => {
      knexFn().first
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(null);

      await expect(service.addMemberToProject(projectId, addMemberDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProjectSettings', () => {
    const projectId = 1;
    const project = { id: projectId, name: 'Old Name', task_prefix: 'OLD' };
    const settingsDto = { name: 'New Name' };

    it('should update project settings within a transaction', async () => {
      knexFn().first.mockResolvedValue(project);
      knexFn().update.mockResolvedValue(1);

      await service.updateProjectSettings(projectId, settingsDto);
      
      expect(knex.transaction).toHaveBeenCalled();
      expect(knexFn).toHaveBeenCalledWith('projects');
      expect(knexFn().update).toHaveBeenCalledWith({ name: 'New Name' });
    });
  });
});