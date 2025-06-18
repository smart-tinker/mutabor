import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Assuming PrismaModule exists

@Module({
  imports: [PrismaModule], // Import PrismaModule to make PrismaService available
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService], // Export if other modules will use it
})
export class ProjectsModule {}
