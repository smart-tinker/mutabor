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

import { ApiProperty } from '@nestjs/swagger';

export class ProjectDto {
  @ApiProperty({ description: 'The unique identifier of the project.' })
  id: number;

  @ApiProperty({ description: 'The name of the project.' })
  name: string;

  @ApiProperty({ description: 'The unique prefix for tasks in the project.' })
  prefix: string;

  @ApiProperty({ description: 'The ID of the user who owns the project.' })
  ownerId: string;

  @ApiProperty({ description: 'The date and time the project was created.' })
  createdAt: Date;

  @ApiProperty({ description: 'The date and time the project was last updated.' })
  updatedAt: Date;

  @ApiProperty({
    description: 'The list of task statuses configured for the project.',
    type: [String],
    required: false,
    example: ['To Do', 'In Progress', 'Done'],
  })
  settings_statuses?: string[];

  @ApiProperty({
    description: 'The list of task types configured for the project.',
    type: [String],
    required: false,
    example: ['Task', 'Bug', 'Feature'],
  })
  settings_types?: string[];

  @ApiProperty({
    description: 'Columns belonging to the project. Only included in detailed project views.',
    type: () => [ColumnDto], // Use arrow function for circular dependencies if ColumnDto is complex
    required: false,
  })
  columns?: ColumnDto[]; // Optional: for GET /projects/:id

  @ApiProperty({
    description: 'Tasks belonging to the project. Only included in detailed project views or specific task queries.',
    type: () => [TaskDto],
    required: false,
  })
  tasks?: TaskDto[];     // Optional: for GET /projects/:id (tasks directly under project, if any, or just all tasks for board)
}
