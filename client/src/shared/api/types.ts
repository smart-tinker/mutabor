// client/src/shared/api/types.ts
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

// ### НОВЫЕ ТИПЫ ДЛЯ УПРАВЛЕНИЯ УЧАСТНИКАМИ ###
export interface AllParticipantsDto {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export interface UpdateMemberRoleDto {
  role: 'editor' | 'viewer';
}

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}