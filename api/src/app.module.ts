// api/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
// import { UsersModule } from './users/users.module'; // ЭТОГО МОДУЛЯ НЕТ
// import { DatabaseModule } from './database/database.module'; // ЕГО ЗАМЕНЯЕТ KnexModule
import { KnexModule } from './knex/knex.module'; // ИСПОЛЬЗУЕМ ЭТОТ
import { CaslModule } from './casl/casl.module';
import { PoliciesGuard } from './casl/policies.guard';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
// AiModule мы отключили переименованием папки

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    KnexModule, // Используем существующий KnexModule
    AuthModule,
    // UsersModule, // УДАЛЕНО
    ProjectsModule,
    TasksModule,
    CaslModule,
    EventsModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PoliciesGuard,
    },
  ],
})
export class AppModule {}