// Purposely excluding password_hash from UserRecord for security best practices
// when returning user objects from services.
export interface UserRecord {
  id: string; // UUID
  email: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectRecord {
  id: number; // SERIAL
  name: string;
  owner_id: string; // Foreign key to UserRecord.id
  task_prefix: string;
  last_task_number: number;
  created_at: Date;
  updated_at: Date;
  columns?: ColumnRecord[];
}

export interface ColumnRecord {
  id: string; // UUID
  name: string;
  project_id: number; // Foreign key to ProjectRecord.id
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface TaskRecord {
  id: string; // UUID
  human_readable_id: string;
  task_number: number;
  title: string;
  description: string | null;
  position: number;
  project_id: number; // Foreign key to ProjectRecord.id
  column_id: string; // Foreign key to ColumnRecord.id
  assignee_id: string | null; // Foreign key to UserRecord.id
  creator_id: string; // Foreign key to UserRecord.id
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CommentRecord {
  id: string; // UUID
  text: string;
  task_id: string; // Foreign key to TaskRecord.id
  author_id: string; // Foreign key to UserRecord.id
  created_at: Date;
  updated_at: Date;
  // For returning comments with author details:
  author?: UserRecord;
}

export interface NotificationRecord {
  id: string; // UUID
  recipient_id: string; // Foreign key to UserRecord.id
  text: string;
  is_read: boolean;
  source_url: string | null;
  task_id: string | null; // Foreign key to TaskRecord.id
  created_at: Date;
  updated_at: Date;
}

export interface ProjectMemberRecord {
  project_id: number; // Foreign key to ProjectRecord.id
  user_id: string; // Foreign key to UserRecord.id
  role: string; // e.g., 'editor', 'viewer'
  created_at: Date;
  updated_at: Date;
}
