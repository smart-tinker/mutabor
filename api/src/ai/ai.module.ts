import { Module, forwardRef } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ConfigModule } from '@nestjs/config';
import { ProjectsModule } from '../projects/projects.module';
import { EncryptionService } from '../common/services/encryption.service';
import { KnexModule } from '../knex/knex.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    ConfigModule,
    KnexModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => TasksModule),
  ],
  controllers: [AiController],
  providers: [AiService, EncryptionService], // EncryptionService используется внутри AiService
  exports: [AiService],
})
export class AiModule {}