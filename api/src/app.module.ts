// api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { KnexModule } from './knex/knex.module';
import { CaslModule } from './casl/casl.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AppController } from './app.controller';
import { CommentsModule } from './comments/comments.module';
import { PoliciesGuard } from './casl/policies.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    KnexModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    CaslModule,
    EventsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [PoliciesGuard],
})
export class AppModule {}