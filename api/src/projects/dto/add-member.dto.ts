import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3) // Example role validation
  role: string; // e.g., 'editor', 'viewer'
}
