// api/src/projects/projects.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { KnexModule } from '../knex/knex.module';
import { TasksModule } from '../tasks/tasks.module';
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [
    KnexModule,
    // Эта связь является частью цикла, поэтому forwardRef здесь обязателен.
    forwardRef(() => TasksModule),
    CaslModule, // CaslModule не участвует в этом цикле, forwardRef не нужен
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}