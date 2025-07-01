// api/src/comments/comments.module.ts
import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { KnexModule } from '../knex/knex.module';
import { EventsModule } from '../events/events.module';
// ### ИЗМЕНЕНИЕ: Убран импорт NotificationsModule, так как он больше не нужен напрямую
// import { NotificationsModule } from '../notifications/notifications.module'; 

@Module({
  // ### ИЗМЕНЕНИЕ: Убран импорт NotificationsModule
  imports: [KnexModule, EventsModule], 
  // ### ИЗМЕНЕНИЕ: Убран CommentsController из providers и exports
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}