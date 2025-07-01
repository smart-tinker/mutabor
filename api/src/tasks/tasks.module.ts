// api/src/tasks/tasks.module.ts
import { Module, Global } from '@nestjs/common'; // ### ИЗМЕНЕНИЕ: Импортируем Global
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { EventsModule } from '../events/events.module';
import { CommentsModule } from '../comments/comments.module';
// ### ИЗМЕНЕНИЕ: ProjectsModule больше не нужен в импортах, т.к. он теперь глобальный
// import { ProjectsModule } from '../projects/projects.module';
import { CaslModule } from '../casl/casl.module';
import { KnexModule } from '../knex/knex.module';
import { NotificationsModule } from '../notifications/notifications.module';

// ### ИЗМЕНЕНИЕ: Добавляем декоратор @Global()
@Global()
@Module({
  imports: [
    KnexModule,
    EventsModule,
    CommentsModule,
    NotificationsModule,
    CaslModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}