// client/src/shared/api/notificationService.ts
import apiClient from './axiosInstance';

export interface NotificationDto {
  id: string;
  text: string;
  isRead: boolean;
  recipientId: string;
  sourceUrl?: string | null;
  taskId?: string | null;
  createdAt: string; // Assuming ISO string
  updatedAt: string;
}

export const notificationService = {
  getUserNotifications: async (): Promise<NotificationDto[]> => {
    const response = await apiClient.get<NotificationDto[]>('/notifications');
    return response.data;
  },

  markNotificationAsRead: async (notificationId: string): Promise<NotificationDto> => {
    const response = await apiClient.patch<NotificationDto>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllNotificationsAsRead: async (): Promise<{ message: string }> => {
    // Backend controller uses POST for this route
    const response = await apiClient.post<{ message: string }>('/notifications/mark-all-read');
    return response.data;
  },
};
