import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
// import { PrismaModule } from '../prisma/prisma.module'; // PrismaModule removed
import { EventsModule } from '../events/events.module'; // Import EventsModule

@Module({
  imports: [EventsModule], // PrismaModule removed, Add EventsModule
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService], // Export for CommentsService
})
export class NotificationsModule {}
