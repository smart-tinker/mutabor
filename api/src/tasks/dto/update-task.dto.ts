import { IsString, IsOptional, IsUUID, MaxLength, IsInt, IsArray, IsDateString } from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @IsUUID()
  @IsOptional()
  columnId?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsOptional()
  @IsDateString() // Changed from IsString
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  priority?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
