// api/src/casl/policy.interface.ts
import { Role } from './roles.enum';

// Контекст теперь - это просто объект с ролью пользователя
export interface PolicyHandlerContext {
  role: Role;
}

// Обработчик - это просто функция, которая принимает роль и возвращает true/false
export interface IPolicyHandler {
  handle(context: PolicyHandlerContext): boolean;
}

export type PolicyHandlerClass = new () => IPolicyHandler;