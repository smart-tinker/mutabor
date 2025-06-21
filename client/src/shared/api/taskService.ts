import apiClient from './axiosInstance'; // Your configured axios instance
import type { TaskDto } from './projectService'; // Reuse TaskDto from projectService for now

export interface CreateTaskDto {
  title: string;
  description?: string;
  columnId: string;
  projectId: number; // Ensure this is passed from BoardPage
  assigneeId?: string;
}

export interface MoveTaskDto {
  newColumnId: string;
  newPosition: number;
  // oldColumnId?: string; // Backend might not need this if it re-calculates based on task's current state
}

// Helper function to transform API comment DTO to client-side DTO
const transformCommentDto = (apiComment: ApiCommentDto): CommentDto => {
  return {
    ...apiComment,
    createdAt: new Date(apiComment.createdAt),
    updatedAt: new Date(apiComment.updatedAt),
  };
};

export const taskService = {
  createTask: async (data: CreateTaskDto): Promise<TaskDto> => {
    const response = await apiClient.post<TaskDto>('/tasks', data);
    return response.data;
  },

  moveTask: async (taskId: string, data: MoveTaskDto): Promise<TaskDto> => {
    const response = await apiClient.patch<TaskDto>(`/tasks/${taskId}/move`, data);
    return response.data;
  },
  // Add other task-related API calls here if needed (e.g., updateTask, getTaskById)

  getTaskComments: async (taskId: string): Promise<CommentDto[]> => {
    const response = await apiClient.get<ApiCommentDto[]>(`/tasks/${taskId}/comments`);
    return response.data.map(transformCommentDto);
  },

  addTaskComment: async (taskId: string, data: CreateCommentPayloadDto): Promise<CommentDto> => {
    const response = await apiClient.post<ApiCommentDto>(`/tasks/${taskId}/comments`, data);
    return transformCommentDto(response.data);
  },
};

// DTOs for Comments
export interface CommentAuthorDto {
  id: string;
  name?: string | null;
  email: string;
}

export interface CommentDto {
  id: string;
  text: string;
  taskId: string;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author?: CommentAuthorDto | null;
}

// DTO for API response before transformation
export interface ApiCommentDto {
  id: string;
  text: string;
  taskId: string;
  authorId: string | null;
  createdAt: string; // Dates are strings from the API
  updatedAt: string; // Dates are strings from the API
  author?: CommentAuthorDto | null;
}

export interface CreateCommentPayloadDto {
  text: string;
}
