// api/src/projects/projects.service.ts
import { Injectable, NotFoundException, ConflictException, Inject, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import { ProjectRecord, UserRecord, ProjectMemberWithUser, ColumnRecord, AllParticipants } from '../types/db-records';
import { ProjectDetailsDto } from './dto/project-details.dto';
import { Role } from '../casl/roles.enum';
import { AuthenticatedUser } from 'src/auth/jwt.strategy';
import { ProjectSettingsDto } from './dto/project-settings.dto';

const DEFAULT_PROJECT_COLUMNS = ['To Do', 'In Progress', 'Done'];
const DEFAULT_PROJECT_TYPES = ['Task', 'Bug', 'Feature'];

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
  ) {}

  async getUserRoleForProject(projectId: number, userId: string, trx?: Knex.Transaction): Promise<Role | null> {
    const db = trx || this.knex;
    const project = await db('projects').where({ id: projectId }).first();
    if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    if (project.owner_id === userId) {
        return Role.Owner;
    }

    const membership = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (membership) {
        return membership.role as Role;
    }

    return null;
  }
  
  async getProjectOwner(projectId: number): Promise<UserRecord> {
    const project = await this.knex('projects').where({ id: projectId }).select('owner_id').first();
    if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }
    const owner = await this.knex('users').where({ id: project.owner_id }).select('id', 'name', 'email', 'created_at', 'updated_at').first();
    if (!owner) {
        throw new NotFoundException(`Owner for project ID ${projectId} not found.`);
    }
    return owner;
  }

  async createProject(createProjectDto: CreateProjectDto, user: AuthenticatedUser): Promise<ProjectRecord> {
    return this.knex.transaction(async (trx) => {
      const [newProject] = await trx('projects')
        .insert({
          name: createProjectDto.name,
          task_prefix: createProjectDto.prefix.toUpperCase(),
          owner_id: user.id,
        })
        .returning('*');
      
      const defaultColumns = DEFAULT_PROJECT_COLUMNS.map((name, index) => ({
        id: crypto.randomUUID(), name, position: index, project_id: newProject.id,
      }));
      await trx('columns').insert(defaultColumns);

      const defaultTypes = DEFAULT_PROJECT_TYPES.map(name => ({
        name, project_id: newProject.id,
      }));
      await trx('project_task_types').insert(defaultTypes);
      
      return newProject;
    });
  }

  async findAllProjectsForUser(userId: string): Promise<ProjectRecord[]> {
    const projectsAsOwner = await this.knex('projects').where({ owner_id: userId });
    const projectsAsMember = await this.knex('projects')
        .join('project_members', 'projects.id', '=', 'project_members.project_id')
        .where('project_members.user_id', userId)
        .select('projects.*');
    
    const allProjects = [...projectsAsOwner, ...projectsAsMember];
    const uniqueProjects = Array.from(new Map(allProjects.map(p => [p.id, p])).values());

    return uniqueProjects.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getProjectDetails(projectId: number): Promise<ProjectDetailsDto> {
    const project = await this.knex('projects').where({ id: projectId }).first();
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    const [columnsDb, tasksDb, taskTypesDb, owner, membersResult] = await Promise.all([
      this.knex('columns').where({ project_id: projectId }).orderBy('position', 'asc'),
      this.knex('tasks').where({ project_id: projectId }).orderBy('position', 'asc'),
      this.knex('project_task_types').where({ project_id: projectId }).orderBy('id', 'asc'),
      this.getProjectOwner(projectId),
      this.getProjectMembers(projectId)
    ]);
    
    const members = membersResult.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }));

    const columns = columnsDb.map(col => ({
      ...col,
      tasks: tasksDb
        .filter(task => task.column_id === col.id)
        .map(task => ({ ...task })),
    }));

    return {
      id: project.id,
      name: project.name,
      prefix: project.task_prefix,
      owner,
      members,
      columns,
      availableTaskTypes: taskTypesDb.map(t => t.name),
    };
  }
  
  async getProjectSettings(projectId: number): Promise<ProjectSettingsDto> {
    const project = await this.knex('projects').where({ id: projectId }).first();
    if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    const statuses = await this.knex('columns')
        .where({ project_id: projectId })
        .orderBy('position', 'asc')
        .select('name');

    const types = await this.knex('project_task_types')
        .where({ project_id: projectId })
        .orderBy('name', 'asc')
        .select('name');

    return {
        id: project.id,
        name: project.name,
        prefix: project.task_prefix,
        settings_statuses: statuses.map(s => s.name),
        settings_types: types.map(t => t.name),
    };
  }

  async updateProjectSettings(
    projectId: number,
    settingsDto: UpdateProjectSettingsDto,
  ): Promise<ProjectSettingsDto> {
    await this.knex.transaction(async (trx) => {
      const project = await trx('projects').where({id: projectId}).first();
      if (!project) throw new NotFoundException(`Project with ID ${projectId} not found.`);

      if (settingsDto.name || settingsDto.prefix) {
        await this.updateProjectCoreDetails(project, settingsDto, trx);
      }
      
      if (settingsDto.types) {
        await this.synchronizeTaskTypes(projectId, settingsDto.types, trx);
      }

      if (settingsDto.statuses) {
        await this.synchronizeStatuses(projectId, settingsDto.statuses, trx);
      }
    });
    
    return this.getProjectSettings(projectId);
  }

  private async updateProjectCoreDetails(project: ProjectRecord, settingsDto: UpdateProjectSettingsDto, trx: Knex.Transaction): Promise<void> {
      const updatePayload: Partial<Pick<ProjectRecord, 'name' | 'task_prefix'>> = {};
      if (settingsDto.name) {
        updatePayload.name = settingsDto.name;
      }
      if (settingsDto.prefix) {
        const newPrefix = settingsDto.prefix.toUpperCase();
        if (newPrefix !== project.task_prefix) {
            const existing = await trx('projects').where({ task_prefix: newPrefix }).whereNot({ id: project.id }).first();
            if (existing) throw new ConflictException(`Project prefix '${newPrefix}' is already in use.`);
            updatePayload.task_prefix = newPrefix;
            await this.updateTaskPrefixesForProject(project.id, project.task_prefix, newPrefix, trx);
        }
      }
      if (Object.keys(updatePayload).length > 0) {
        await trx('projects').where({ id: project.id }).update(updatePayload);
      }
  }

  private async synchronizeTaskTypes(projectId: number, newTypes: string[], trx: Knex.Transaction): Promise<void> {
    await trx('project_task_types').where({ project_id: projectId }).delete();
    if (newTypes.length > 0) {
      const newTypesData = newTypes.map(name => ({ name, project_id: projectId }));
      await trx('project_task_types').insert(newTypesData);
    }
  }

  private async synchronizeStatuses(projectId: number, newStatusNames: string[], trx: Knex.Transaction): Promise<void> {
    const existingColumns = await trx('columns').where({ project_id: projectId });
    const existingNames = existingColumns.map(c => c.name);
    
    const columnsToRemove = existingColumns.filter(c => !newStatusNames.includes(c.name));
    const namesToAdd = newStatusNames.filter(name => !existingNames.includes(name));

    if (columnsToRemove.length > 0) {
      if (newStatusNames.length === 0) throw new BadRequestException('A project must have at least one status column.');
      
      const remainingColumns = existingColumns.filter(c => !columnsToRemove.some(rem => rem.id === c.id));
      const targetColumnForOrphanedTasks = remainingColumns[0] || null;

      if (!targetColumnForOrphanedTasks && namesToAdd.length === 0) {
          throw new BadRequestException('Cannot delete all columns without adding new ones.');
      }

      if (targetColumnForOrphanedTasks?.id) {
        const columnsToRemoveIds = columnsToRemove.map(c => c.id);
        await trx('tasks')
          .whereIn('column_id', columnsToRemoveIds)
          .update({ column_id: targetColumnForOrphanedTasks.id });
      }
      await trx('columns').whereIn('id', columnsToRemove.map(c => c.id)).delete();
    }

    if (namesToAdd.length > 0) {
      const newColumnsData = namesToAdd.map(name => ({
        id: crypto.randomUUID(),
        name,
        project_id: projectId,
        position: -1,
      }));
      await trx('columns').insert(newColumnsData);
    }

    const finalColumns = await trx('columns').where({ project_id: projectId });
    const positionUpdatePromises = newStatusNames.map((name, index) => {
      const columnToUpdate = finalColumns.find(c => c.name === name);
      if (columnToUpdate) {
        return trx('columns').where({ id: columnToUpdate.id }).update({ position: index });
      }
    });
    await Promise.all(positionUpdatePromises.filter(p => p));
  }
  
  private async updateTaskPrefixesForProject(
    projectId: number,
    oldPrefix: string,
    newPrefix: string,
    trx: Knex.Transaction,
  ): Promise<number> {
    const oldPrefixPattern = `${oldPrefix}-`;
    const newPrefixPattern = `${newPrefix}-`;
    const result = await trx.raw(`
        UPDATE tasks
        SET human_readable_id = REPLACE(human_readable_id, ?, ?), updated_at = ?
        WHERE project_id = ? AND human_readable_id LIKE ?`,
        [oldPrefixPattern, newPrefixPattern, new Date(), projectId, `${oldPrefixPattern}%`]
    );
    return result.rowCount || 0;
  }

  async createColumn(projectId: number, createColumnDto: CreateColumnDto): Promise<ColumnRecord> {
    const { name } = createColumnDto;
    const maxPositionResult = await this.knex('columns')
        .where({ project_id: projectId })
        .max('position as max_pos')
        .first();

    const newPosition = (maxPositionResult?.max_pos ?? -1) + 1;

    const [newColumn] = await this.knex('columns')
      .insert({
        id: crypto.randomUUID(),
        name,
        project_id: projectId,
        position: newPosition,
      })
      .returning('*');

    return newColumn;
  }

  async updateColumn(projectId: number, columnId: string, updateColumnDto: UpdateColumnDto): Promise<ColumnRecord> {
    const column = await this.knex('columns').where({ id: columnId, project_id: projectId }).first();
    if (!column) throw new NotFoundException(`Column with ID ${columnId} not found in this project.`);

    const [updatedColumn] = await this.knex('columns')
      .where({ id: columnId })
      .update({ name: updateColumnDto.name, updated_at: new Date() })
      .returning('*');
    
    return updatedColumn;
  }

  async deleteColumn(projectId: number, columnId: string): Promise<void> {
    await this.knex.transaction(async (trx) => {
        const allColumns = await trx('columns').where({ project_id: projectId }).orderBy('position', 'asc');
        
        if (allColumns.length <= 1) {
            throw new BadRequestException('Cannot delete the last column. A project must have at least one column.');
        }

        const columnToDelete = allColumns.find(c => c.id === columnId);
        if (!columnToDelete) {
            this.logger.warn(`Attempted to delete non-existent column ${columnId} in project ${projectId}.`);
            return; // Exit gracefully if column is already gone.
        }

        const columnIndex = allColumns.findIndex(c => c.id === columnId);
        
        // Find a new home for the tasks: the previous column, or the next one if deleting the first.
        const targetColumn = (columnIndex > 0) ? allColumns[columnIndex - 1] : allColumns[1];
        
        // Move tasks from the deleted column to the target column.
        await trx('tasks')
            .where({ column_id: columnId })
            .update({ column_id: targetColumn.id });

        // Delete the column itself.
        await trx('columns').where({ id: columnId }).delete();
        
        // Re-sequence the remaining columns to ensure there are no gaps in `position`.
        const remainingColumns = allColumns.filter(c => c.id !== columnId);
        const updatePromises = remainingColumns.map((col, index) =>
            trx('columns')
                .where({ id: col.id })
                .update({ position: index })
        );
        await Promise.all(updatePromises);
    });
  }
  
  async isTaskTypeValidForProject(projectId: number, taskType: string, trx?: Knex.Transaction): Promise<boolean> {
      if (!taskType) return true;
      const db = trx || this.knex;
      const typeRecord = await db('project_task_types').where({ project_id: projectId, name: taskType }).first();
      return !!typeRecord;
  }

  async addMemberToProject(projectId: number, addMemberDto: AddMemberDto): Promise<AllParticipants> {
    const project = await this.knex('projects').where({ id: projectId }).first();
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found.`);

    const userToAdd = await this.knex('users').where({ email: addMemberDto.email }).first();
    if (!userToAdd) throw new NotFoundException(`User with email ${addMemberDto.email} not found.`);
    if (userToAdd.id === project.owner_id) throw new ConflictException('Cannot add the project owner as a member.');
    
    const existingMembership = await this.knex('project_members').where({ project_id: projectId, user_id: userToAdd.id }).first();
    if (existingMembership) throw new ConflictException(`User ${addMemberDto.email} is already a member of this project.`);
    
    await this.knex('project_members').insert({ project_id: projectId, user_id: userToAdd.id, role: addMemberDto.role });
    
    const user = await this.knex('users').where({ id: userToAdd.id }).first();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: addMemberDto.role
    };
  }
  
  async getProjectMembers(projectId: number): Promise<ProjectMemberWithUser[]> {
    const membersData = await this.knex('project_members')
      .join('users', 'project_members.user_id', '=', 'users.id')
      .where('project_members.project_id', projectId)
      .select('project_members.role', 'users.id', 'users.name', 'users.email', 'users.created_at', 'users.updated_at')
      .orderBy('users.name', 'asc');
    
    return membersData.map(m => ({
        project_id: projectId, user_id: m.id, role: m.role,
        user: { id: m.id, name: m.name, email: m.email, created_at: m.created_at, updated_at: m.updated_at, password_hash: '', role: 'user' }
    }));
  }

  async getAllProjectParticipants(projectId: number): Promise<AllParticipants[]> {
    const owner = await this.getProjectOwner(projectId);
    const members = await this.getProjectMembers(projectId);

    const ownerData: AllParticipants = {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      role: Role.Owner,
    };

    const membersData: AllParticipants[] = members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }));
    
    return [ownerData, ...membersData];
  }

  async updateProjectMember(projectId: number, userId: string, updateDto: UpdateMemberDto): Promise<AllParticipants> {
    const project = await this.knex('projects').where({ id: projectId }).select('owner_id').first();
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found.`);
    if (project.owner_id === userId) throw new ForbiddenException('Cannot change the role of the project owner.');

    const [updatedMember] = await this.knex('project_members')
      .where({ project_id: projectId, user_id: userId })
      .update({ role: updateDto.role, updated_at: new Date() })
      .returning('*');

    if (!updatedMember) throw new NotFoundException(`Member with ID ${userId} not found in project ${projectId}.`);

    const user = await this.knex('users').where({ id: userId }).select('id', 'name', 'email').first();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: updatedMember.role,
    };
  }

  async removeMemberFromProject(projectId: number, userId: string): Promise<void> {
    const project = await this.knex('projects').where({ id: projectId }).select('owner_id').first();
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found.`);
    if (project.owner_id === userId) throw new ForbiddenException('Cannot remove the project owner.');

    const deletedCount = await this.knex('project_members')
      .where({ project_id: projectId, user_id: userId })
      .delete();
      
    if (deletedCount === 0) {
      throw new NotFoundException(`Member with ID ${userId} not found in project ${projectId}.`);
    }
  }
}