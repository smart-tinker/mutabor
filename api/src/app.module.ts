// api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { APP_GUARD } from '@nestjs/core'; // УДАЛЕНО
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { KnexModule } from './knex/knex.module';
import { CaslModule } from './casl/casl.module';
// import { PoliciesGuard } from './casl/policies.guard'; // УДАЛЕНО
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AppController } from './app.controller';
import { CommentsModule } from './comments/comments.module';

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
    CaslModule, // Оставляем, т.к. может понадобиться в будущем
    EventsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  // ### ИЗМЕНЕНИЕ: Убираем глобальный PoliciesGuard ###
  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: PoliciesGuard,
    // },
  ],
})
export class AppModule {}