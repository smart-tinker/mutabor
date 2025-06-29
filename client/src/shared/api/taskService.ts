import apiClient from './axiosInstance';
import type { TaskDto as FullTaskDto } from './projectService'; 
// DTO для создания задачи
export interface CreateTaskDto {
  title: string;
  description?: string;
  columnId: string;
  // projectId is now part of the URL, not the DTO body
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
  assigneeId?: string | null;
  dueDate?: string | null;
  type?: string | null;
  priority?: string | null;
  tags?: string[] | null;
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

export interface ApiCommentDto {
  id: string;
  text: string;
  task_id: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  author?: CommentAuthorDto | null;
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

export const transformCommentDto = (apiComment: ApiCommentDto): CommentDto => ({
  ...apiComment,
  taskId: apiComment.task_id,
  authorId: apiComment.author_id,
  createdAt: new Date(apiComment.created_at),
  updatedAt: new Date(apiComment.updated_at),
});

export const taskService = {
  // ### ИЗМЕНЕНО: projectId теперь передается в URL, а не в теле
  createTask: async (projectId: number, data: Omit<CreateTaskDto, 'projectId'>): Promise<FullTaskDto> => {
    const response = await apiClient.post<FullTaskDto>(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  moveTask: async (taskId: string, data: MoveTaskDto): Promise<FullTaskDto> => {
    const response = await apiClient.patch<FullTaskDto>(`/tasks/${taskId}/move`, data);
    return response.data;
  },

  updateTask: async (taskId: string, data: UpdateTaskDto): Promise<FullTaskDto> => {
    const response = await apiClient.patch<FullTaskDto>(`/tasks/${taskId}`, data);
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

  // ### ИЗМЕНЕНО: теперь вызывает правильный эндпоинт
  getTaskById: async (humanReadableId: string): Promise<FullTaskDto> => {
    const response = await apiClient.get<FullTaskDto>(`/tasks/by-hid/${humanReadableId}`);
    return response.data;
  },
};