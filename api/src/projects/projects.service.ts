import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined
import * as crypto from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async createProject(createProjectDto: CreateProjectDto, user: any /* User */) {
    return this.knex.transaction(async (trx) => {
      const [newProject] = await trx('projects')
        .insert({
          name: createProjectDto.name,
          task_prefix: createProjectDto.prefix, // Assuming column name task_prefix
          owner_id: user.id, // Assuming column name owner_id
          last_task_number: 0,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      const defaultColumns = [
        { id: crypto.randomUUID(), name: 'To Do', position: 0, project_id: newProject.id, created_at: new Date(), updatedAt: new Date() },
        { id: crypto.randomUUID(), name: 'In Progress', position: 1, project_id: newProject.id, created_at: new Date(), updatedAt: new Date() },
        { id: crypto.randomUUID(), name: 'Done', position: 2, project_id: newProject.id, created_at: new Date(), updatedAt: new Date() },
      ];

      const insertedColumns = await trx('columns').insert(defaultColumns).returning('*');
      return { ...newProject, columns: insertedColumns };
    });
  }

  async findAllProjectsForUser(user: any /* User */) {
    // Also fetch projects where user is a member
    const projectsAsOwner = await this.knex('projects')
      .where({ owner_id: user.id })
      .orderBy('created_at', 'desc');

    const projectsAsMember = await this.knex('projects')
      .join('project_members', 'projects.id', '=', 'project_members.project_id')
      .where('project_members.user_id', user.id)
      .select('projects.*') // select all columns from projects table
      .orderBy('projects.created_at', 'desc');

    // Combine and remove duplicates (if any, though unlikely with this logic)
    const allProjects = [...projectsAsOwner, ...projectsAsMember];
    const uniqueProjects = Array.from(new Set(allProjects.map(p => p.id)))
      .map(id => allProjects.find(p => p.id === id));

    return uniqueProjects;
  }

  async findProjectById(projectId: number, user: any /* User */) {
    const project = await this.knex('projects').where({ id: projectId }).first();

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    // Check if user is owner or member
    const isOwner = project.owner_id === user.id;
    let isMember = false;
    if (!isOwner) {
      const member = await this.knex('project_members')
        .where({ project_id: projectId, user_id: user.id })
        .first();
      isMember = !!member;
    }

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have permission to access this project.');
    }

    const columns = await this.knex('columns')
      .where({ project_id: projectId })
      .orderBy('position', 'asc');

    const tasksByColumn = await this.knex('tasks')
      .whereIn('column_id', columns.map(c => c.id))
      .orderBy('position', 'asc');

    const columnsWithTasks = columns.map(column => ({
      ...column,
      tasks: tasksByColumn.filter(task => task.column_id === column.id),
    }));

    return { ...project, columns: columnsWithTasks };
  }

  async addMemberToProject(projectId: number, addMemberDto: AddMemberDto, currentUserId: string) {
    const project = await this.knex('projects').where({ id: projectId }).first();

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    if (project.owner_id !== currentUserId) {
      throw new ForbiddenException('Only project owners can add members.');
    }

    const userToAdd = await this.knex('users').where({ email: addMemberDto.email }).first();

    if (!userToAdd) {
      throw new NotFoundException(`User with email ${addMemberDto.email} not found.`);
    }

    if (userToAdd.id === currentUserId) {
      throw new ConflictException('Cannot add the project owner as a member.');
    }

    const existingMembership = await this.knex('project_members')
      .where({ project_id: projectId, user_id: userToAdd.id })
      .first();

    if (existingMembership) {
      throw new ConflictException(`User ${addMemberDto.email} is already a member of this project.`);
    }

    const [newMember] = await this.knex('project_members')
      .insert({
        project_id: projectId,
        user_id: userToAdd.id,
        role: addMemberDto.role,
        // created_at and updated_at if your table has them
      })
      .returning('*'); // Or specific columns if needed

    return {
      ...newMember,
      user: { id: userToAdd.id, email: userToAdd.email, name: userToAdd.name }, // Manually attach user details
    };
  }

  async getProjectMembers(projectId: number, currentUserId: string) {
     // First, verify the current user has access to the project (is owner or member)
    const project = await this.knex('projects').where({ id: projectId }).first();
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }
    const isOwner = project.owner_id === currentUserId;
    let isMember = false;
    if(!isOwner) {
        const membership = await this.knex('project_members')
            .where({project_id: projectId, user_id: currentUserId})
            .first();
        isMember = !!membership;
    }
    if(!isOwner && !isMember) {
        throw new ForbiddenException('You do not have permission to view members of this project.');
    }

    return this.knex('project_members')
      .join('users', 'project_members.user_id', '=', 'users.id')
      .where('project_members.project_id', projectId)
      .select(
        'project_members.role',
        'users.id as userId', // Alias to avoid confusion
        'users.email',
        'users.name',
      )
      .orderBy('users.name', 'asc')
      .then(members => members.map(m => ({
          role: m.role,
          user: {
              id: m.userId,
              email: m.email,
              name: m.name
          }
      })));
  }
}
