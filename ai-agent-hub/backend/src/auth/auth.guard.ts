import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ClerkService } from './clerk.service';
import { UsersService } from '../users/users.service';
import { extractBearer } from './optional-auth.guard';

/** Requires a valid Clerk session. Used for personal data endpoints. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly clerk: ClerkService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const identity = await this.clerk.verify(extractBearer(req));
    if (!identity) throw new UnauthorizedException('Authentication required');
    const user = await this.users.syncFromClerk(identity);
    if (!user) throw new UnauthorizedException('User could not be resolved');
    req.user = user;
    return true;
  }
}
