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
    const response = await apiClient.get<CommentDto[]>(`/tasks/${taskId}/comments`);
    // Transform date strings to Date objects
    return response.data.map(comment => ({
      ...comment,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
    }));
  },

  addTaskComment: async (taskId: string, data: CreateCommentPayloadDto): Promise<CommentDto> => {
    const response = await apiClient.post<CommentDto>(`/tasks/${taskId}/comments`, data);
    // Transform date strings to Date objects
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };
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

export interface CreateCommentPayloadDto {
  text: string;
}
