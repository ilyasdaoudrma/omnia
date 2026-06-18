import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

/** Injects the request's authenticated DB user (or null in anonymous mode). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: User | null }>();
    return req.user ?? null;
  },
);
