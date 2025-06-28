import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { EventsModule } from '../events/events.module';
import { CommentsModule } from '../comments/comments.module';
import { ProjectsModule } from '../projects/projects.module';
import { CaslModule } from '../casl/casl.module'; // Импорт CaslModule

@Module({
  imports: [
    EventsModule,
    CommentsModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => CaslModule), // Добавляем CaslModule
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}