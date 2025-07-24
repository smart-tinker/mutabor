// api/src/comments/comments.module.ts
import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { KnexModule } from '../knex/knex.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [KnexModule, EventsModule], 
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}