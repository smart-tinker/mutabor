import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class MoveTaskDto {
  @IsUUID()
  @IsNotEmpty()
  newColumnId: string;

  // Позиция в новой колонке (начиная с 0)
  @IsInt()
  @Min(0)
  newPosition: number;
}