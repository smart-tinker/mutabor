// Assuming an axios instance is configured, e.g., client/src/shared/api/axiosInstance.ts
import { apiClient } from './axiosInstance'; // Using axiosInstance.ts as seen from ls

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
  dueDate?: Date;
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
}

export interface CreateProjectDto {
  name: string;
  prefix: string;
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
};
