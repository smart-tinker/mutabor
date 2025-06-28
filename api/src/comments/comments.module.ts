import { Module, forwardRef } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';

@Module({
  // Используем forwardRef для разрешения циклических зависимостей, если они возникнут
  imports: [forwardRef(() => NotificationsModule), EventsModule],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}