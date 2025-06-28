// api/src/casl/check-policies.decorator.ts

import { SetMetadata } from '@nestjs/common';
// Импортируем наш новый тип для класса политики
import { PolicyHandlerClass } from './policy.interface';

export const CHECK_POLICIES_KEY = 'check_policy';

// Декоратор теперь принимает массив классов политик
export const CheckPolicies = (...handlers: PolicyHandlerClass[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);