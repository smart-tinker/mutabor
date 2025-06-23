import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { EventsModule } from '../events/events.module';
import { CommentsModule } from '../comments/comments.module';
import { ProjectsModule } from '../projects/projects.module'; // --- ИСПРАВЛЕНИЕ #5 ---

@Module({
  imports: [
    EventsModule,
    CommentsModule,
    ProjectsModule, // --- ИСПРАВЛЕНИЕ #5 ---
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}