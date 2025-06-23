import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [NotificationsModule, EventsModule],
  providers: [CommentsService],
  // Controller is removed as TasksController will handle comment endpoints
  exports: [CommentsService],
})
export class CommentsModule {}