import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { KnexModule } from '../knex/knex.module';
import { TasksModule } from '../tasks/tasks.module'; // Import TasksModule

@Module({
  imports: [
    KnexModule,
    forwardRef(() => TasksModule), // Use forwardRef here as well
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}