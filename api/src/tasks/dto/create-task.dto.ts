import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: 'The title of the task.', example: 'Implement login feature' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'A detailed description of the task.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'The ID of the column (status) this task belongs to.', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsUUID()
  columnId: string;

  // projectId удален из DTO, так как он теперь передается через URL параметр
  // @IsInt()
  // projectId: number;

  @ApiProperty({ description: 'The ID of the user this task is assigned to.', required: false })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiProperty({ description: 'The due date for the task in ISO 8601 format.', required: false, example: '2024-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'The type of the task (e.g., "Bug", "Feature").', required: false, example: 'Feature' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'The priority of the task (e.g., "High", "Low").', required: false, example: 'High' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({ description: 'An array of tags for the task.', required: false, example: ['frontend', 'auth'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}