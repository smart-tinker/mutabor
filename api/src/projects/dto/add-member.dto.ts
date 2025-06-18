// Создайте новый файл: mutabor/api/src/projects/dto/add-member.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}