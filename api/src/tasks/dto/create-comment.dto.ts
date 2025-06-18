import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Текст комментария не может быть пустым.' })
  @MaxLength(1000, { message: 'Комментарий не может быть длиннее 1000 символов.' })
  text: string;
}