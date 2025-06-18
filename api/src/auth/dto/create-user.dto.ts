import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Пожалуйста, введите корректный email.' })
  @IsNotEmpty({ message: 'Email не может быть пустым.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Имя не может быть пустым.' })
  name: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать не менее 8 символов.' })
  password: string;
}