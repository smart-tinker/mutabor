// client/src/shared/api/types.ts

// --- Типы для Проектов и Участников ---

export interface ProjectSettingsResponse {
  id: number;
  name: string;
  prefix: string;
  settings_statuses?: string[];
  settings_types?: string[];
}

export interface UpdateProjectSettingsPayload {
  name?: string;
  prefix?: string;
  statuses?: string[];
  types?: string[];
}

export interface AllParticipantsDto {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export interface UpdateMemberRoleDto {
  role: 'editor' | 'viewer';
}

export interface AddMemberDto {
  email: string;
  role: 'editor' | 'viewer';
}

export interface ProjectListDto {
  id: number;
  name: string;
  task_prefix: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectDto {
  name: string;
  prefix: string;
}

export interface FullProjectDto extends ProjectListDto {
  columns?: ColumnDto[];
  tasks?: TaskDto[];
  settings_statuses?: string[];
  settings_types?: string[];
}


// --- Типы для Задач и Колонок ---

export interface TaskDto {
  id: string;
  human_readable_id: string; 
  title: string;
  description?: string | null;
  position: number;
  project_id: number;
  column_id: string;
  assignee_id?: string | null;
  creator_id: string;
  due_date?: string | null;
  type?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  columnId: string;
  assigneeId?: string;
  dueDate?: string;
  type?: string;
  priority?: string;
  tags?: string[];
}

// ### НОВОЕ: Типы для обновления и перемещения задачи перенесены сюда ###
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


export interface ColumnDto {
  id: string;
  name: string;
  position: number;
  project_id: number;
  tasks?: TaskDto[];
  created_at: string;
  updated_at: string;
}

// --- Типы для Комментариев ---
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


// --- Общие типы ---

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}