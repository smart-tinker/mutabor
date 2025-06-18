import { IsUUID, IsNotEmpty, IsInt } from 'class-validator';

export class MoveTaskDto {
  @IsUUID()
  @IsNotEmpty()
  newColumnId: string;

  @IsInt()
  @IsNotEmpty()
  newPosition: number; // 0-based index in the new column

  @IsUUID()
  @IsOptional() // If moving from one column to another, old column might be needed for reordering
  oldColumnId?: string;
}
