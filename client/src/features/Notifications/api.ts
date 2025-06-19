// client/src/features/Notifications/api.ts
import { notificationService } from '../../shared/api/notificationService';
import type { NotificationDto } from '../../shared/api/notificationService';

export const getUserNotifications = (): Promise<NotificationDto[]> => {
  return notificationService.getUserNotifications();
};

export const markNotificationAsRead = (notificationId: string): Promise<NotificationDto> => {
  return notificationService.markNotificationAsRead(notificationId);
};

export const markAllNotificationsAsRead = (): Promise<{ message: string }> => {
  return notificationService.markAllNotificationsAsRead();
};
