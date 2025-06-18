// Полный путь: mutabor/api/src/auth/decorators/get-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Passport.js добавляет объект user в request после успешной валидации токена.
    return request.user;
  },
);