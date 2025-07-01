import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';
import { Role } from '../casl/roles.enum';
import { AddMemberDto } from './dto/add-member.dto';
import { UserRecord, ProjectMemberWithUser } from '../types/db-records';

const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'user' };

describe('ProjectsService', () => {
  let service: ProjectsService;
  let knex;

  beforeEach(async () => {
    // ### ИЗМЕНЕНИЕ: Универсальный и надежный мок Knex ###
    const mockKnex = jest.fn().mockReturnThis();
    
    // Присваиваем все используемые методы самому моку, чтобы они были доступны в цепочке
    Object.assign(mockKnex, {
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockResolvedValue(1),
      raw: jest.fn(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      max: jest.fn().mockReturnThis(),
      // Самое важное: транзакция передает сам мок в колбэк
      transaction: jest.fn().mockImplementation(async (callback) => callback(mockKnex)),
    });
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { 
          provide: KNEX_CONNECTION, 
          useValue: mockKnex,
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
      knex.first
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(userToAdd)
        .mockResolvedValueOnce(null);
      knex.insert.mockResolvedValueOnce({});

      const result = await service.addMemberToProject(projectId, addMemberDto);
      
      expect(result.id).toEqual(userToAdd.id);
      expect(result.role).toBe(Role.Editor);
    });

    it('should throw ConflictException if user is already a member', async () => {
      knex.first
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(userToAdd)
        .mockResolvedValueOnce({ user_id: userToAdd.id });

      await expect(service.addMemberToProject(projectId, addMemberDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getProjectDetails', () => {
    it('should aggregate and return full project details', async () => {
        const projectId = 1;
        const mockProject = { id: projectId, name: 'Test Project', task_prefix: 'TP', owner_id: 'owner-uuid' };
        const mockOwner: UserRecord = { id: 'owner-uuid', name: 'Owner', email: 'owner@test.com', role: 'user', password_hash: 'hash', created_at: new Date(), updated_at: new Date() };
        const mockMembers: ProjectMemberWithUser[] = [{ 
            project_id: projectId, user_id: 'member-uuid', role: Role.Editor, 
            user: { id: 'member-uuid', name: 'Member', email: 'member@test.com', created_at: new Date(), updated_at: new Date() } 
        }];
        const mockColumns = [{ id: 'col-1', name: 'To Do', position: 0 }, { id: 'col-2', name: 'Done', position: 1 }];
        const mockTasks = [{ id: 'task-1', column_id: 'col-1', position: 0, title: 'Task 1' }];
        const mockTaskTypes = [{ name: 'Bug' }, { name: 'Feature' }];

        knex.first.mockResolvedValueOnce(mockProject);
        knex.orderBy
            .mockResolvedValueOnce(mockColumns)
            .mockResolvedValueOnce(mockTasks)
            .mockResolvedValueOnce(mockTaskTypes);

        jest.spyOn(service, 'getProjectOwner').mockResolvedValue(mockOwner);
        jest.spyOn(service, 'getProjectMembers').mockResolvedValue(mockMembers);
        
        const result = await service.getProjectDetails(projectId);

        expect(result.id).toBe(projectId);
        expect(result.name).toBe(mockProject.name);
        expect(result.owner.id).toBe(mockOwner.id);
    });
  });

  describe('updateProjectSettings', () => {
    const projectId = 1;
    const project = { id: projectId, name: 'Old Name', task_prefix: 'OLD' };

    it('should update project name only', async () => {
        knex.first.mockResolvedValue(project);
        knex.update.mockResolvedValue(1);
        jest.spyOn(service, 'getProjectSettings').mockResolvedValue({} as any);

        await service.updateProjectSettings(projectId, { name: 'New Name' });
        
        expect(knex.transaction).toHaveBeenCalled();
        expect(knex.update).toHaveBeenCalledWith({ name: 'New Name' });
    });

    it('should throw ConflictException when updating prefix to an existing one', async () => {
        knex.first
            .mockResolvedValueOnce(project)
            .mockResolvedValueOnce({ id: 2 }); 
            
        await expect(service.updateProjectSettings(projectId, { prefix: 'NEW' })).rejects.toThrow(ConflictException);
    });

    it('should update prefix and tasks human_readable_id', async () => {
        knex.first
          .mockResolvedValueOnce(project)
          .mockResolvedValueOnce(null);
        knex.raw.mockResolvedValue({ rowCount: 5 });
        knex.update.mockResolvedValue(1);
        jest.spyOn(service, 'getProjectSettings').mockResolvedValue({} as any);
    
        await service.updateProjectSettings(projectId, { prefix: 'NEW' });
    
        expect(knex.raw).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE tasks'),
          ['OLD-', 'NEW-', expect.any(Date), projectId, 'OLD-%']
        );
        expect(knex.update).toHaveBeenCalledWith(expect.objectContaining({ task_prefix: 'NEW' }));
    });
  });

  describe('deleteColumn', () => {
    const projectId = 1;
    const columns = [
      { id: 'col1', name: 'To Do', position: 0 },
      { id: 'col2', name: 'In Progress', position: 1 },
    ];

    it('should throw BadRequestException if trying to delete a column when only one is left', async () => {
      knex.orderBy.mockResolvedValueOnce([{ id: 'col1' }]);
      await expect(service.deleteColumn(projectId, 'col1')).rejects.toThrow(BadRequestException);
    });
    
    it('should delete a column and move its tasks to the previous column', async () => {
      const tasksToMove = [{ id: 'task1', column_id: 'col2' }];
      
      knex.orderBy.mockResolvedValueOnce(columns);
      knex.where.mockReturnValueOnce({ // for tasksToMove
        ...knex, // return the whole mock for chaining
        [Symbol.asyncIterator]: async function*() { // make it iterable for the loop
           yield* tasksToMove;
        },
        then: function (resolve) { // make it thenable for await
           resolve(tasksToMove);
        },
      });
      knex.max.mockReturnValueOnce({ first: () => Promise.resolve({ max_pos: 0 }) });
      knex.update.mockResolvedValue(1);
      knex.delete.mockResolvedValue(1);
        
      await service.deleteColumn(projectId, 'col2');

      expect(knex.transaction).toHaveBeenCalled();
      expect(knex.update).toHaveBeenCalledWith(expect.objectContaining({ column_id: 'col1' }));
      expect(knex.delete).toHaveBeenCalled();
    });
  });
});