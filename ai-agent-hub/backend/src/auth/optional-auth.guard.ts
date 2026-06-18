import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ClerkService } from './clerk.service';
import { UsersService } from '../users/users.service';

/**
 * Attaches the authenticated DB user to the request when a valid Clerk token is
 * present, but ALWAYS allows the request through. This lets the public agent
 * demo run anonymously while still personalizing/persisting for signed-in users.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly clerk: ClerkService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = extractBearer(req);
    const identity = await this.clerk.verify(token);
    if (identity) {
      req.user = (await this.users.syncFromClerk(identity)) ?? null;
    } else {
      req.user = null;
    }
    return true;
  }
}

export function extractBearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return undefined;
}
