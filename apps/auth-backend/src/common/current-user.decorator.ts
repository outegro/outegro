import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "@outegro/auth-client";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
