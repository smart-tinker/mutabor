import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module'; // Import EventsModule
import { CommentsModule } from '../comments/comments.module'; // Import CommentsModule

@Module({
  imports: [
    PrismaModule,
    EventsModule, // Add EventsModule
    CommentsModule, // Add CommentsModule
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
