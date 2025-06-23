import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsAlphanumeric,
  ArrayNotEmpty,
  ArrayMinSize,
} from 'class-validator';

export class UpdateProjectSettingsDto {
  @ApiProperty({
    description: 'The new name of the project',
    example: 'My Awesome Project Revised',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'The new unique prefix for tasks in the project (uppercase, alphanumeric)',
    example: 'NPROJ',
    required: false,
    minLength: 2,
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @IsAlphanumeric()
  @MinLength(2)
  @MaxLength(10)
  // Consider adding a Transform to uppercase: @Transform(({ value }) => value.toUpperCase())
  prefix?: string;

  @ApiProperty({
    description: 'The list of task statuses for the project',
    example: ['To Do', 'In Progress', 'Review', 'Done'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  // @ArrayNotEmpty() is redundant if @ArrayMinSize(1) is present
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(50, { each: true })
  statuses?: string[];

  @ApiProperty({
    description: 'The list of task types for the project',
    example: ['Feature', 'Bug Fix', 'Documentation', 'Refactor'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  // @ArrayNotEmpty() is redundant if @ArrayMinSize(1) is present
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(50, { each: true })
  types?: string[];
}
