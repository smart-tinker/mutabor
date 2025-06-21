import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { NotificationsModule } from '../notifications/notifications.module'; // Import NotificationsModule
import { EventsModule } from '../events/events.module'; // Import EventsModule
import { CommentsController } from './comments.controller';

@Module({
  imports: [NotificationsModule, EventsModule],
  providers: [CommentsService],
  controllers: [CommentsController], // Only if a dedicated controller is made
  exports: [CommentsService], // Export if other modules will use it directly
})
export class CommentsModule {}
