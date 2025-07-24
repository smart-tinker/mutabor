// api/src/auth/profile.controller.ts
import { Controller, Get, UseGuards, Patch, Body, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { UserRecord } from '../types/db-records';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthService } from './auth.service';

@ApiBearerAuth()
@ApiTags('Profile')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/profile')
export class ProfileController {
  constructor(private authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns the current user profile.' })
  getProfile(@GetUser() user: Omit<UserRecord, 'password_hash'>) {
    return user;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  updateProfile(
    @GetUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<Omit<UserRecord, 'password_hash'>> {
    return this.authService.updateProfile(userId, updateProfileDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input (e.g., weak new password).' })
  @ApiResponse({ status: 401, description: 'Old password does not match.' })
  async changePassword(
    @GetUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully.' };
  }
}