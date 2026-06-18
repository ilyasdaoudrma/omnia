import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();

    // Normal path: a signed-in user supplies a Clerk session token.
    const identity = await this.clerk.verify(extractBearer(req));
    if (identity) {
      const user = await this.users.syncFromClerk(identity);
      if (!user) throw new UnauthorizedException('User could not be resolved');
      req.user = user;
      return true;
    }

    // Trusted server-to-server path: the OMNIA agent scheduler places recurring
    // rides on a user's behalf when they aren't present (no live session).
    // Authenticated by a shared secret header + the target user's clerkId in body.
    if (await this.resolveAgentService(req)) return true;

    throw new UnauthorizedException('Authentication required');
  }

  private async resolveAgentService(req: Request & { user?: unknown }): Promise<boolean> {
    const secret = this.config.get<string>('OMNIA_AGENT_SECRET');
    const provided = req.headers['x-omnia-agent-secret'];
    const body = req.body as { clerkId?: string; email?: string } | undefined;
    const clerkId = body?.clerkId;
    if (!secret || provided !== secret || !clerkId) return false;
    const user = await this.users.findOrCreateByClerkId(clerkId, body?.email);
    if (!user) return false;
    req.user = user;
    return true;
  }
}
