import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'The current password of the user.',
    example: 'OldSecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    description: 'The new password for the user. Must be at least 8 characters.',
    example: 'NewSecurePassword456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}