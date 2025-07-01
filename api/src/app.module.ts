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
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'; // ### НОВОЕ: Импортируем JwtAuthGuard

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : (process.env.NODE_ENV === 'development' ? '.env.dev' : '.env'),
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
  // ### ИЗМЕНЕНИЕ: Регистрируем оба гварда глобально. Порядок важен! ###
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // JwtAuthGuard должен идти первым
    },
    {
      provide: APP_GUARD,
      useClass: PoliciesGuard,
    },
  ],
})
export class AppModule {}