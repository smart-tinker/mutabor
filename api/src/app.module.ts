import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller'; // Import AppController
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module'; // Added ProjectsModule
import { TasksModule } from './tasks/tasks.module'; // Added TasksModule
import { EventsModule } from './events/events.module'; // Added EventsModule
import { CommentsModule } from './comments/comments.module'; // Import CommentsModule
import { NotificationsModule } from './notifications/notifications.module'; // Import NotificationsModule

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    ProjectsModule, // Added ProjectsModule
    TasksModule, // Added TasksModule
    EventsModule, // Added EventsModule
    CommentsModule, // Add CommentsModule here
    NotificationsModule, // Add NotificationsModule here
  ],
  controllers: [AppController], // Add AppController here
})
export class AppModule {}
