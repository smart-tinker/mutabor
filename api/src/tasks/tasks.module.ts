// api/src/tasks/tasks.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { EventsModule } from '../events/events.module';
import { CommentsModule } from '../comments/comments.module';
import { ProjectsModule } from '../projects/projects.module';
import { CaslModule } from '../casl/casl.module';
import { KnexModule } from '../knex/knex.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    KnexModule,
    EventsModule,
    CommentsModule,
    NotificationsModule,
    forwardRef(() => ProjectsModule), // Цикл только с ProjectsModule, его и разрываем
    CaslModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}