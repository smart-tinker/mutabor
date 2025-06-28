// api/src/casl/casl.module.ts
import { Module } from '@nestjs/common';
// import { CaslAbilityFactory } from './casl-ability.factory'; // УДАЛЯЕМ ЭТОТ ИМПОРТ

@Module({
  // Этот модуль теперь пуст, так как гвард глобальный,
  // а фабрику мы удалили. Он больше не нужен для DI.
  imports: [], 
  providers: [],
  exports: [],
})
export class CaslModule {}