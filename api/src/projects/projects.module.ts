// api/src/projects/projects.module.ts
import { Module, Global } from '@nestjs/common'; // ### ИЗМЕНЕНИЕ: Импортируем Global
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { KnexModule } from '../knex/knex.module';
import { CaslModule } from '../casl/casl.module';

// ### ИЗМЕНЕНИЕ: Добавляем декоратор @Global()
@Global()
@Module({
  imports: [
    KnexModule,
    CaslModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}