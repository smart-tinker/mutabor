import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module'; // Import NotificationsModule
import { EventsModule } from '../events/events.module'; // Import EventsModule
// Remove CommentsController if not creating it
// import { CommentsController } from './comments.controller';

@Module({
  imports: [PrismaModule, NotificationsModule, EventsModule], // Import PrismaModule, NotificationsModule, and EventsModule
  providers: [CommentsService],
  // controllers: [CommentsController], // Only if a dedicated controller is made
  exports: [CommentsService], // Export if other modules will use it directly
})
export class CommentsModule {}
