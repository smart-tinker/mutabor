// client/src/shared/api/projectService.ts

import apiClient from './axiosInstance';
import type { 
  ProjectSettingsResponse, 
  UpdateProjectSettingsPayload, 
  AllParticipantsDto, 
  UpdateMemberRoleDto,
  AddMemberDto,
  CreateProjectDto,
  FullProjectDto,
  ProjectListDto,
} from './types';

// Экспортируем типы, которые могут понадобиться в других местах UI (например, на страницах)
export type { 
  TaskDto, 
  ColumnDto, 
  FullProjectDto, 
  ProjectListDto,
  CreateProjectDto,
  AllParticipantsDto,
  AddMemberDto,
} from './types';


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

  addProjectMember: async (projectId: number, data: AddMemberDto): Promise<AllParticipantsDto> => {
    const response = await apiClient.post<AllParticipantsDto>(`/projects/${projectId}/members`, data);
    return response.data;
  },
  
  getAllProjectParticipants: async (projectId: number): Promise<AllParticipantsDto[]> => {
    const response = await apiClient.get<AllParticipantsDto[]>(`/projects/${projectId}/members`);
    return response.data;
  },

  updateProjectMember: async (projectId: number, userId: string, data: UpdateMemberRoleDto): Promise<AllParticipantsDto> => {
    const response = await apiClient.patch<AllParticipantsDto>(`/projects/${projectId}/members/${userId}`, data);
    return response.data;
  },
  
  removeProjectMember: async (projectId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`);
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