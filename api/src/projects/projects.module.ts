// api/src/projects/projects.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { KnexModule } from '../knex/knex.module';
import { CaslModule } from '../casl/casl.module';
import { TasksModule } from '../tasks/tasks.module'; // ### НОВОЕ: Импортируем TasksModule

// ### ИЗМЕНЕНИЕ: Убираем декоратор @Global() ###
@Module({
  imports: [
    KnexModule,
    CaslModule,
    forwardRef(() => TasksModule), // ### НОВОЕ: Используем forwardRef для разрыва цикла
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}