import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module'; // Import EventsModule

@Module({
  imports: [PrismaModule, EventsModule], // Add EventsModule
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService], // Export for CommentsService
})
export class NotificationsModule {}
