// api/src/tasks/tasks.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { EventsModule } from '../events/events.module';
import { CommentsModule } from '../comments/comments.module';
import { CaslModule } from '../casl/casl.module';
import { KnexModule } from '../knex/knex.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module'; // ### НОВОЕ: Импортируем ProjectsModule

// ### ИЗМЕНЕНИЕ: Убираем декоратор @Global() ###
@Module({
  imports: [
    KnexModule,
    EventsModule,
    CommentsModule,
    NotificationsModule,
    CaslModule,
    forwardRef(() => ProjectsModule), // ### НОВОЕ: Используем forwardRef для разрыва цикла
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}