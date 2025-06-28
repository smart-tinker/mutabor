import { ApiProperty } from '@nestjs/swagger';

// Вспомогательные DTO для вложенных структур
class ProjectOwnerDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;
  
  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;
}

class ProjectMemberDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1' })
  id: string;

  @ApiProperty({ example: 'Jane Smith' })
  name: string;
  
  @ApiProperty({ example: 'jane.smith@example.com' })
  email: string;

  @ApiProperty({ example: 'editor' })
  role: string;
}

// DTO для задач будет более полным, но для примера здесь только базовые поля.
// Предполагается, что существует более полный TaskDto.
class TaskSummaryDto {
    id: string;
    human_readable_id: string;
    title: string;
    position: number;
    assignee_id: string | null;
    type: string | null;
    priority: string | null;
}

class ColumnWithTasksDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  position: number;

  @ApiProperty({ type: [TaskSummaryDto] })
  tasks: TaskSummaryDto[];
}

// Основной DTO, который возвращается клиенту
export class ProjectDetailsDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Mutabor Project' })
  name: string;

  @ApiProperty({ example: 'MUT' })
  prefix: string;

  @ApiProperty({ type: ProjectOwnerDto })
  owner: ProjectOwnerDto;

  @ApiProperty({ type: [ProjectMemberDto] })
  members: ProjectMemberDto[];

  @ApiProperty({ type: [ColumnWithTasksDto] })
  columns: ColumnWithTasksDto[];

  @ApiProperty({ type: [String], example: ['Task', 'Bug', 'Feature'] })
  availableTaskTypes: string[];
}