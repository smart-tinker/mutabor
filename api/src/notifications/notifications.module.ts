import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EventsModule } from '../events/events.module';
import { KnexModule } from '../knex/knex.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    KnexModule, 
    EventsModule,
    forwardRef(() => ProjectsModule) // Для получения данных о проекте
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // Экспортируем сервис для использования в других модулях
})
export class NotificationsModule {}