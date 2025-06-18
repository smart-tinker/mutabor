import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]+$/, { message: 'Prefix must be uppercase alphanumeric characters.' })
  @MaxLength(10)
  prefix: string; // For task IDs like "PROJ-1"
}
