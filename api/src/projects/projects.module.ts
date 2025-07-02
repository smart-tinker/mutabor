// api/src/projects/projects.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { KnexModule } from '../knex/knex.module';
// ### ИЗМЕНЕНИЕ: Закомментированный импорт CaslModule удален ###
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    KnexModule,
    // ### ИЗМЕНЕНИЕ: Закомментированный импорт CaslModule удален ###
    forwardRef(() => TasksModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}