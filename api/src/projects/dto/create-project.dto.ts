import { IsNotEmpty, IsString, MaxLength, IsAlphanumeric, IsUppercase } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  
  @IsString()
  @IsNotEmpty()
  @IsUppercase() // Префикс должен быть в верхнем регистре
  @IsAlphanumeric() // Только буквы и цифры
  @MaxLength(5)
  prefix: string;
}