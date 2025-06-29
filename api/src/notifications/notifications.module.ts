// api/src/notifications/notifications.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EventsModule } from '../events/events.module';
import { KnexModule } from '../knex/knex.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    KnexModule, 
    EventsModule,
    // ProjectsModule нужен, чтобы получить всех участников проекта для @-упоминаний
    forwardRef(() => ProjectsModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}