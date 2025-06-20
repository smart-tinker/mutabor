import { Controller, Get, Patch, Param, Req, UseGuards, Post, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common'; // Added HttpCode, HttpStatus
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { User } from '@prisma/client'; // Prisma User type removed

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(@Req() req) {
    const user = req.user as any; // Replaced User with any
    return this.notificationsService.getUserNotifications(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK) // Added HttpCode
  async markNotificationAsRead(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    const user = req.user as any; // Replaced User with any
    return this.notificationsService.markNotificationAsRead(id, user.id);
  }

  @Post('mark-all-read') // Changed to POST as it's an action changing multiple states
  @HttpCode(HttpStatus.OK) // Added HttpCode
  async markAllNotificationsAsRead(@Req() req) {
    const user = req.user as any; // Replaced User with any
    return this.notificationsService.markAllNotificationsAsRead(user.id);
  }
}
