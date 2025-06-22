import apiClient from './axiosInstance'; // Your configured axios instance
import type { TaskDto } from './projectService'; // Reuse TaskDto from projectService for now

export interface CreateTaskDto {
  title: string;
  description?: string;
  columnId: string;
  projectId: number; // Ensure this is passed from BoardPage
  assigneeId?: string;
  // Fields from previous CreateTaskDto in backend, to be aligned with TaskRecord
  dueDate?: string;
  type?: string;
  priority?: string;
  tags?: string[];
}

// For updating tasks, all fields are optional
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  columnId?: string; // Usually handled by move, but can be here for general updates
  assigneeId?: string | null; // Allow setting to null
  dueDate?: string | null; // Allow setting to null
  type?: string | null; // Allow setting to null
  priority?: string | null; // Allow setting to null
  tags?: string[] | null; // Allow setting to null
  position?: number; // If position is also updatable directly
}

export interface MoveTaskDto {
  newColumnId: string;
  newPosition: number;
  // oldColumnId?: string; // Backend might not need this if it re-calculates based on task's current state
}

// Helper function to transform API comment DTO to client-side DTO
export const transformCommentDto = (apiComment: ApiCommentDto): CommentDto => {
  return {
    id: apiComment.id,
    text: apiComment.text,
    taskId: apiComment.task_id,
    authorId: apiComment.author_id,
    createdAt: new Date(apiComment.created_at),
    updatedAt: new Date(apiComment.updated_at),
    author: apiComment.author,
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
  task_id: string;
  author_id: string | null;
  created_at: string; // Dates are strings from the API
  updated_at: string; // Dates are strings from the API
  author?: CommentAuthorDto | null; // Assuming CommentAuthorDto is already correct or will be handled separately
}

export interface CreateCommentPayloadDto {
  text: string;
}
