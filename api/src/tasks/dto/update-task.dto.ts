import { IsString, IsOptional, IsUUID, MaxLength, IsInt } from 'class-validator';

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
}
