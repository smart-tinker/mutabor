import { Controller, Get, Patch, Param, Req, UseGuards, Post, ParseUUIDPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(@Req() req) {
    const user = req.user as User;
    return this.notificationsService.getUserNotifications(user.id);
  }

  @Patch(':id/read')
  async markNotificationAsRead(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    const user = req.user as User;
    return this.notificationsService.markNotificationAsRead(id, user.id);
  }

  @Post('mark-all-read') // Changed to POST as it's an action changing multiple states
  async markAllNotificationsAsRead(@Req() req) {
    const user = req.user as User;
    return this.notificationsService.markAllNotificationsAsRead(user.id);
  }
}
