// api/src/projects/dto/project-settings.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ProjectSettingsDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'My Awesome Project' })
  name: string;
  
  @ApiProperty({ example: 'AWESOME' })
  prefix: string;

  @ApiProperty({ type: [String], example: ['To Do', 'In Progress', 'Done'] })
  settings_statuses: string[];

  @ApiProperty({ type: [String], example: ['Bug', 'Feature', 'Chore'] })
  settings_types: string[];
}