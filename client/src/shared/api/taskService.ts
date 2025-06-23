import apiClient from './axiosInstance';
import type { TaskDto } from './projectService'; // Import unified TaskDto

// DTO for creating a task
export interface CreateTaskDto {
  title: string;
  description?: string;
  columnId: string;
  projectId: number;
  assigneeId?: string;
  dueDate?: string;
  type?: string;
  priority?: string;
  tags?: string[];
}

// For updating tasks, all fields are optional
export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  columnId?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  type?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  position?: number;
}

export interface MoveTaskDto {
  newColumnId: string;
  newPosition: number;
}

// DTOs for Comments
export interface CommentAuthorDto {
  id: string;
  name?: string | null;
  email: string;
}

// Raw DTO from API
export interface ApiCommentDto {
  id: string;
  text: string;
  task_id: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  author?: CommentAuthorDto | null;
}

// Client-side DTO with Date objects
export interface CommentDto {
  id: string;
  text: string;
  taskId: string;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author?: CommentAuthorDto | null;
}

export interface CreateCommentPayloadDto {
  text: string;
}

// Helper function to transform API comment DTO to client-side DTO
export const transformCommentDto = (apiComment: ApiCommentDto): CommentDto => ({
  ...apiComment,
  taskId: apiComment.task_id,
  authorId: apiComment.author_id,
  createdAt: new Date(apiComment.created_at),
  updatedAt: new Date(apiComment.updated_at),
});

export const taskService = {
  createTask: async (data: CreateTaskDto): Promise<TaskDto> => {
    const response = await apiClient.post<TaskDto>('/tasks', data);
    return response.data;
  },

  moveTask: async (taskId: string, data: MoveTaskDto): Promise<TaskDto> => {
    const response = await apiClient.patch<TaskDto>(`/tasks/${taskId}/move`, data);
    return response.data;
  },

  updateTask: async (taskId: string, data: UpdateTaskDto): Promise<TaskDto> => {
    const response = await apiClient.patch<TaskDto>(`/tasks/${taskId}`, data);
    return response.data;
  },

  getTaskComments: async (taskId: string): Promise<CommentDto[]> => {
    const response = await apiClient.get<ApiCommentDto[]>(`/tasks/${taskId}/comments`);
    return response.data.map(transformCommentDto);
  },

  addTaskComment: async (taskId: string, data: CreateCommentPayloadDto): Promise<CommentDto> => {
    const response = await apiClient.post<ApiCommentDto>(`/tasks/${taskId}/comments`, data);
    return transformCommentDto(response.data);
  },

  getTaskById: async (taskId: string): Promise<TaskDto> => {
    const response = await apiClient.get<TaskDto>(`/tasks/by-hid/${taskId}`);
    return response.data;
  },
};