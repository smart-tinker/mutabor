import { Controller, Get, Param, Patch, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiBearerAuth()
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's notifications" })
  async getMyNotifications(@GetUser('id') userId: string) {
    return this.notificationsService.getNotificationsForUser(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  // ### НОВЫЙ ЭНДПОИНТ ###
  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all of the user\'s notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read.' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@GetUser('id') userId: string) {
    const result = await this.notificationsService.markAllAsReadForUser(userId);
    return { message: `${result.updatedCount} notifications marked as read.` };
  }
}