// api/src/projects/projects.module.ts
import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { KnexModule } from '../knex/knex.module';
// import { TasksModule } from '../tasks/tasks.module'; // УДАЛЕНО
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [
    KnexModule,
    // forwardRef(() => TasksModule), // УДАЛЕНО
    CaslModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}