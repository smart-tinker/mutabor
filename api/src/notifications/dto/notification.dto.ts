import { UserRecord as User } from 'src/types/db-records'; // Or a UserDto

export class NotificationDto {
  id: string;
  text: string;
  isRead: boolean;
  recipientId: string;
  sourceUrl?: string | null;
  taskId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Optional: include recipient or task details if needed directly in DTO
  // recipient?: Partial<User>;
}
