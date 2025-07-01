// api/src/types/db-records.d.ts

export type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  role: 'admin' | 'user'; // ### НОВОЕ: Добавлено поле роли
  created_at: Date;
  updated_at: Date;
};

export type ProjectRecord = {
  id: number;
  name: string;
  task_prefix: string;
  last_task_number: number;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
};

export type ProjectMemberRecord = {
  project_id: number;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
};

export type ProjectMemberWithUser = ProjectMemberRecord & {
  user: Pick<UserRecord, 'id' | 'name' | 'email' | 'created_at' | 'updated_at'>;
};

export type ColumnRecord = {
  id: string;
  name: string;
  position: number;
  project_id: number;
  created_at: Date;
  updated_at: Date;
};

export type TaskRecord = {
  id: string;
  human_readable_id: string;
  task_number: number;
  title: string;
  description: string | null;
  position: number;
  type: string | null;
  priority: string | null;
  tags: string[] | null;
  project_id: number;
  column_id: string;
  assignee_id: string | null;
  creator_id: string;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CommentRecord = {
  id: string;
  text: string;
  task_id: string;
  author_id: string | null;
  created_at: Date;
  updated_at: Date;
  author?: Pick<UserRecord, 'id' | 'name' | 'email'>;
};

export type NotificationRecord = {
    id: string;
    recipient_id: string;
    text: string;
    is_read: boolean;
    source_url: string | null;
    task_id: string | null;
    created_at: Date;
    updated_at: Date;
};