// api/src/tasks/tasks.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { EventsModule } from '../events/events.module';
import { CommentsModule } from '../comments/comments.module';
import { ProjectsModule } from '../projects/projects.module';
import { CaslModule } from '../casl/casl.module';
import { KnexModule } from '../knex/knex.module'; // ### ДОБАВЛЕНО: Необходимый импорт

@Module({
  imports: [
    KnexModule, // TasksService использует Knex, этот импорт обязателен
    EventsModule,
    // Эта связь является частью цикла, поэтому forwardRef здесь обязателен.
    forwardRef(() => CommentsModule),
    // И эта связь является частью цикла (в обратную сторону).
    forwardRef(() => ProjectsModule),
    CaslModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}