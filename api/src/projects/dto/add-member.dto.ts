// api/src/projects/dto/add-member.dto.ts
import { IsEmail, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../casl/roles.enum';

export class AddMemberDto {
  @ApiProperty({
    description: "The email of the user to add to the project.",
    example: "member@example.com"
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  // ### ИЗМЕНЕНИЕ: Заменяем IsString на IsEnum ###
  // Теперь принимаются только значения 'editor' или 'viewer'.
  // Роль 'owner' не включена, так как владелец назначается при создании проекта.
  @ApiProperty({ 
    description: "The role to assign to the new member.",
    enum: [Role.Editor, Role.Viewer],
    example: Role.Editor 
  })
  @IsEnum([Role.Editor, Role.Viewer])
  @IsNotEmpty()
  role: Role.Editor | Role.Viewer;
}