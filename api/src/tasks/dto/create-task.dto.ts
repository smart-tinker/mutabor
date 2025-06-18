import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength, IsInt } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  columnId: string;

  @IsInt()
  @IsNotEmpty()
  projectId: number; // To generate humanReadableId (e.g., PROJ-1) and for association

  @IsUUID()
  @IsOptional() // Assignee can be optional
  assigneeId?: string;

  // position will be handled by the service, typically added at the end of the column
}
