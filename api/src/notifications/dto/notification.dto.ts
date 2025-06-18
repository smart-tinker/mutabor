import { User } from '@prisma/client'; // Or a UserDto

export class NotificationDto {
  id: string;
  text: string;
  isRead: boolean;
  recipientId: string;
  sourceUrl?: string | null; // Prisma schema has String?
  taskId?: string | null;    // Prisma schema has String?
  createdAt: Date;
  updatedAt: Date;
  // Optional: include recipient or task details if needed directly in DTO
  // recipient?: Partial<User>;
}
