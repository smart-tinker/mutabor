import { TaskDto } from '../../tasks/dto/task.dto'; // Assuming TaskDto will be created

// Removed: import { ColumnDto } from './column.dto';
// As ColumnDto is defined in this file.

export class ColumnDto { // Defined ColumnDto first as ProjectDto uses it.
  id: string;
  name: string;
  position: number;
  projectId: number;
  tasks?: TaskDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectDto {
  id: number;
  name: string;
  prefix: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  columns?: ColumnDto[]; // Optional: for GET /projects/:id
  tasks?: TaskDto[];     // Optional: for GET /projects/:id (tasks directly under project, if any, or just all tasks for board)
}
