import { apiClient } from './axiosInstance'; // Your configured axios instance
import { TaskDto } from './projectService'; // Reuse TaskDto from projectService for now

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
};
