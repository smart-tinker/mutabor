// api/src/notifications/guards/notification-owner.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { KNEX_CONNECTION } from '../../knex/knex.constants';
import { Knex } from 'knex';
import { AuthenticatedUser } from '../../auth/jwt.strategy';

@Injectable()
export class NotificationOwnerGuard implements CanActivate {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    const notificationId = request.params.id;

    if (!user || !notificationId) {
      // This case should ideally not be hit if JwtAuthGuard is used before this guard
      return false;
    }

    const notification = await this.knex('notifications')
      .where({ id: notificationId })
      .select('recipient_id')
      .first();

    if (!notification) {
      // Важно не раскрывать, существует ли уведомление, если у пользователя нет к нему доступа.
      // Поэтому в случае отсутствия или несовпадения владельца бросаем одну и ту же ошибку.
      throw new ForbiddenException('You do not have permission to access this resource.');
    }

    if (notification.recipient_id !== user.id) {
      throw new ForbiddenException('You do not have permission to access this resource.');
    }
    
    return true;
  }
}