import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';
import { Role } from '../casl/roles.enum';
import { AddMemberDto } from './dto/add-member.dto';
import { UserRecord, ProjectMemberWithUser } from '../types/db-records';

const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'user' };

describe('ProjectsService', () => {
  let service: ProjectsService;
  let knex; 
  let knexFn;
  let mockMethods;

  beforeEach(async () => {
    mockMethods = {
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
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
      mockMethods.first
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(userToAdd)
        .mockResolvedValueOnce(null);
      
      const newMemberRecord = { project_id: projectId, user_id: userToAdd.id, role: addMemberDto.role };
      mockMethods.returning.mockResolvedValueOnce([newMemberRecord]);

      const result = await service.addMemberToProject(projectId, addMemberDto);
      
      expect(result.user).toEqual(expect.objectContaining({ id: userToAdd.id, email: userToAdd.email }));
      expect(result.role).toBe(Role.Editor);
    });

    it('should throw ConflictException if user is already a member', async () => {
      mockMethods.first
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
            project_id: projectId, 
            user_id: 'member-uuid', 
            role: Role.Editor, 
            user: { id: 'member-uuid', name: 'Member', email: 'member@test.com', created_at: new Date(), updated_at: new Date() } 
        }];
        const mockColumns = [{ id: 'col-1', name: 'To Do', position: 0 }, { id: 'col-2', name: 'Done', position: 1 }];
        const mockTasks = [{ id: 'task-1', column_id: 'col-1', position: 0, title: 'Task 1' }, { id: 'task-2', column_id: 'col-1', position: 1, title: 'Task 2' }];
        const mockTaskTypes = [{ name: 'Bug' }, { name: 'Feature' }];

        // ### ИЗМЕНЕНИЕ: Управляем моками для каждого вызова ###
        mockMethods.first.mockResolvedValue(mockProject);
        jest.spyOn(service, 'getProjectOwner').mockResolvedValue(mockOwner);
        jest.spyOn(service, 'getProjectMembers').mockResolvedValue(mockMembers);
        
        (knexFn as jest.Mock)
          .mockImplementation((table: string) => {
            if (table === 'columns') return { orderBy: jest.fn().mockResolvedValue(mockColumns) };
            if (table === 'tasks') return { orderBy: jest.fn().mockResolvedValue(mockTasks) };
            if (table === 'project_task_types') return { orderBy: jest.fn().mockResolvedValue(mockTaskTypes) };
            return mockMethods;
          });
        
        const result = await service.getProjectDetails(projectId);

        expect(result.id).toBe(projectId);
        expect(result.name).toBe(mockProject.name);
        expect(result.owner.id).toBe(mockOwner.id);
        expect(result.members.length).toBe(1);
        expect(result.columns.length).toBe(2);
        expect(result.columns[0].tasks.length).toBe(2);
        expect(result.availableTaskTypes).toEqual(['Bug', 'Feature']);
    });
  });

  describe('updateProjectSettings', () => {
    const projectId = 1;
    const project = { id: projectId, name: 'Old Name', task_prefix: 'OLD' };

    it('should update project name only', async () => {
        mockMethods.first.mockResolvedValue(project);
        mockMethods.update.mockResolvedValue(1);

        await service.updateProjectSettings(projectId, { name: 'New Name' });
        
        expect(knex.transaction).toHaveBeenCalled();
        expect(mockMethods.update).toHaveBeenCalledWith({ name: 'New Name' });
    });
  });
});