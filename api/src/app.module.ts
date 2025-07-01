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
// AI-модуль не импортируется глобально, т.к. он исключен из сборки
// import { AiModule } from './ai/ai.module';

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
    // AiModule, // Не включаем в сборку по умолчанию
  ],
  controllers: [AppController],
  // ### ИЗМЕНЕНИЕ: Глобальный PoliciesGuard полностью убран. ###
  providers: [],
})
export class AppModule {}