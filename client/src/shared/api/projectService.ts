// Assuming an axios instance is configured, e.g., client/src/shared/api/axiosInstance.ts
import apiClient from './axiosInstance'; // Using axiosInstance.ts as seen from ls
import { ProjectSettingsResponse, UpdateProjectSettingsPayload } from './types';

// Define interfaces for DTOs based on backend DTOs
// These should ideally be in a shared types folder or generated from backend schema

export interface ColumnDto {
  id: string;
  name: string;
  position: number;
  projectId: number;
  tasks?: TaskDto[]; // TaskDto to be defined similarly
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDto {
  id: string;
  humanReadableId: string;
  taskNumber: number;
  title: string;
  description?: string;
  position: number;
  projectId: number;
  columnId: string;
  assigneeId?: string;
  creatorId: string;
  dueDate?: string; // Kept as string, client can parse if needed
  type?: string;
  priority?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDto {
  id: number;
  name: string;
  prefix: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  columns?: ColumnDto[];
  tasks?: TaskDto[]; // Or all tasks for the board if not nested under columns in this DTO
  // Added from backend ProjectDto for settings
  settings_statuses?: string[];
  settings_types?: string[];
}

export interface CreateProjectDto {
  name: string;
  prefix: string;
}

// Add near other DTO definitions in projectService.ts
export interface UserSummaryDto { // For nested user details
  id: string;
  email: string;
  name?: string | null;
}

export interface ProjectMemberDto {
  userId: string;
  projectId: number;
  role: string;
  user?: UserSummaryDto; // Based on backend response
  // Add other fields if the backend sends more for a ProjectMember
}

export interface AddMemberDto {
  email: string;
  role: string;
}

export const projectService = {
  createProject: async (data: CreateProjectDto): Promise<ProjectDto> => {
    const response = await apiClient.post<ProjectDto>('/projects', data);
    return response.data;
  },

  getUserProjects: async (): Promise<ProjectDto[]> => {
    const response = await apiClient.get<ProjectDto[]>('/projects');
    return response.data;
  },

  getProjectById: async (projectId: number): Promise<ProjectDto> => {
    const response = await apiClient.get<ProjectDto>(`/projects/${projectId}`);
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

  // Project Settings API calls
  getProjectSettings: async (projectId: number): Promise<ProjectSettingsResponse> => {
    const response = await apiClient.get<ProjectSettingsResponse>(`/projects/${projectId}/settings`);
    return response.data;
  },

  updateProjectSettings: async (projectId: number, data: UpdateProjectSettingsPayload): Promise<ProjectSettingsResponse> => {
    const response = await apiClient.put<ProjectSettingsResponse>(`/projects/${projectId}/settings`, data);
    return response.data;
  },
};
