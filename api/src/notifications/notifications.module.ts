import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EventsModule } from '../events/events.module'; // Import EventsModule

@Module({
  imports: [EventsModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService], // Export for CommentsService
})
export class NotificationsModule {}
