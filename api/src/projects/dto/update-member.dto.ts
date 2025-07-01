// api/src/projects/dto/update-member.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../casl/roles.enum';

export class UpdateMemberDto {
  @ApiProperty({ 
    description: "The new role to assign to the member.",
    enum: [Role.Editor, Role.Viewer],
    example: Role.Editor 
  })
  @IsEnum([Role.Editor, Role.Viewer])
  @IsNotEmpty()
  role: Role.Editor | Role.Viewer;
}