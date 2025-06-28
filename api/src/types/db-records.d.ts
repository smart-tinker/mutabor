export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectRecord {
  id: number;
  name: string;
  task_prefix: string;
  owner_id: string;
  last_task_number: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectTaskTypeRecord {
    id: number;
    name: string;
    project_id: number;
    created_at: Date;
    updated_at: Date;
}

export interface ColumnRecord {
  id: string;
  name: string;
  position: number;
  project_id: number;
  tasks?: TaskRecord[]; // This is for temporary in-memory joining, not a DB column
  created_at: Date;
  updated_at: Date;
}

export interface TaskRecord {
  id: string;
  human_readable_id: string;
  task_number: number;
  title: string;
  description: string | null;
  position: number;
  project_id: number;
  column_id: string;
  assignee_id: string | null;
  creator_id: string;
  type: string | null;
  priority: string | null;
  tags: string[] | null;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectMemberRecord {
    project_id: number;
    user_id: string;
    role: string;
    created_at: Date;
    updated_at: Date;
}

export interface ProjectMemberWithUser extends ProjectMemberRecord {
    user: Omit<UserRecord, 'password_hash'>;
}

// NOTE: ProjectDetailsDto has been moved to its own file in `src/projects/dto`
// to separate database record types from data transfer objects.