import apiClient from './axiosInstance';
import type { ProjectSettingsResponse, UpdateProjectSettingsPayload } from './types';

export interface TaskDto {
  id: string;
  // ### ИЗМЕНЕНИЕ: Исправлено имя поля для соответствия с API ###
  human_readable_id: string; 
  title: string;
  description?: string | null;
  position: number;
  project_id: number;
  column_id: string;
  assignee_id?: string | null;
  creator_id: string;
  due_date?: string | null;
  type?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ColumnDto {
  id: string;
  name: string;
  position: number;
  project_id: number;
  tasks?: TaskDto[];
  created_at: string;
  updated_at: string;
}

export interface ProjectListDto {
  id: number;
  name: string;
  task_prefix: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface FullProjectDto extends ProjectListDto {
  columns?: ColumnDto[];
  tasks?: TaskDto[];
  settings_statuses?: string[];
  settings_types?: string[];
}

export type ParsedProjectRecord = FullProjectDto;

export interface CreateProjectDto {
  name: string;
  prefix: string;
}

export interface UserSummaryDto {
  id: string;
  email: string;
  name?: string | null;
}

export interface ProjectMemberDto {
  project_id: number;
  user_id: string;
  role: string;
  user?: UserSummaryDto;
}

export interface AddMemberDto {
  email: string;
  role: string;
}

export const projectService = {
  createProject: async (data: CreateProjectDto): Promise<FullProjectDto> => {
    const response = await apiClient.post<FullProjectDto>('/projects', data);
    return response.data;
  },

  getUserProjects: async (): Promise<ProjectListDto[]> => {
    const response = await apiClient.get<ProjectListDto[]>('/projects');
    return response.data;
  },

  getProjectById: async (projectId: number): Promise<FullProjectDto> => {
    const response = await apiClient.get<FullProjectDto>(`/projects/${projectId}`);
    return response.data;
  },

  addProjectMember: async (projectId: number, data: AddMemberDto): Promise<ProjectMemberDto> => {
    const response = await apiClient.post<ProjectMemberDto>(`/projects/${projectId}/members`, data);
    return response.data;
  },

  getProjectMembers: async (projectId: number): Promise<ProjectMemberDto[]> => {
    const response = await apiClient.get<ProjectMemberDto[]>(`/projects/${projectId}/members`);
    return response.data;
  },

  getProjectSettings: async (projectId: number): Promise<ProjectSettingsResponse> => {
    const response = await apiClient.get<ProjectSettingsResponse>(`/projects/${projectId}/settings`);
    return response.data;
  },

  updateProjectSettings: async (projectId: number, data: UpdateProjectSettingsPayload): Promise<ProjectSettingsResponse> => {
    const response = await apiClient.put<ProjectSettingsResponse>(`/projects/${projectId}/settings`, data);
    return response.data;
  },
};