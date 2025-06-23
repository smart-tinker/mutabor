// This file will store shared API data types/interfaces

/**
 * Represents the data structure for project settings as returned by the API
 * for the specific settings endpoints.
 */
export interface ProjectSettingsResponse {
  id: number;
  name: string;
  // task_prefix is returned as 'prefix' by the ProjectDto/settings endpoints
  prefix: string;
  settings_statuses?: string[]; // Optional as per ProjectDto on backend for general GETs, but expected from settings endpoint
  settings_types?: string[];  // Optional as per ProjectDto on backend for general GETs, but expected from settings endpoint
}

/**
 * Represents the payload for updating project settings.
 * All fields are optional.
 */
export interface UpdateProjectSettingsPayload {
  name?: string;
  prefix?: string;
  statuses?: string[];
  types?: string[];
}

/**
 * Represents a generic API error structure.
 */
export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string; // e.g., "Bad Request"
  // Depending on backend error structure, more fields might be present
}

// Add other shared API types here as the application grows.
// For example, User, Task, Comment types if they are not defined elsewhere
// in a more feature-specific or entity-specific manner.

// Example: Basic Task type (if not defined in a more FSD-compliant way under entities/Task)
/*
export interface Task {
  id: string;
  human_readable_id: string;
  title: string;
  description?: string | null;
  column_id: string;
  project_id: number;
  assignee_id?: string | null;
  // ... other task fields
}
*/
