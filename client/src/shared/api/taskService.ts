// client/src/shared/api/taskService.ts

import apiClient from './axiosInstance';
// ### ИЗМЕНЕНИЕ: Импортируем все DTO из types.ts ###
import type { 
  TaskDto as FullTaskDto, 
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  ApiCommentDto,
  CommentDto,
  CreateCommentPayloadDto,
} from './types'; 

// ### ИЗМЕНЕНИЕ: Все локальные определения DTO удалены ###

// Хелпер для трансформации остается здесь, так как это логика сервиса
export const transformCommentDto = (apiComment: ApiCommentDto): CommentDto => ({
  ...apiComment,
  taskId: apiComment.task_id,
  authorId: apiComment.author_id,
  createdAt: new Date(apiComment.created_at),
  updatedAt: new Date(apiComment.updated_at),
});

export const taskService = {
  createTask: async (projectId: number, data: CreateTaskDto): Promise<FullTaskDto> => {
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

  getTaskByHumanId: async (humanReadableId: string): Promise<FullTaskDto> => {
    const response = await apiClient.get<FullTaskDto>(`/tasks/${humanReadableId}`);
    return response.data;
  },
};