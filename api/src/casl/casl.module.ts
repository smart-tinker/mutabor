import { Module, forwardRef } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';

// Этот модуль не экспортирует провайдеров, так как Guard глобальный.
// Он служит для разрешения циклических зависимостей.
@Module({
    imports: [
        forwardRef(() => ProjectsModule),
        forwardRef(() => TasksModule),
    ],
})
export class CaslModule {}