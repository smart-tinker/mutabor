import { Controller, Get, Param, Patch, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiBearerAuth()
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
// ### ИЗМЕНЕНИЕ: Добавляем префикс /api/v1 ###
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
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }
}