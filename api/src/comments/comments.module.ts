// api/src/comments/comments.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';
import { KnexModule } from '../knex/knex.module';

@Module({
  imports: [
    KnexModule,
    // Эта связь является частью цикла, поэтому forwardRef здесь обязателен.
    forwardRef(() => NotificationsModule), 
    EventsModule
  ],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}