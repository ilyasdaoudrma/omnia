import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Decode a JWT's `sub` (Clerk user id) WITHOUT verifying — used only as a
 * rate-limit bucket key, so it must be stable across token refreshes (the raw
 * token rotates ~every 60s, and its header prefix is identical across users).
 */
function subFromJwt(token: string): string | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { sub?: unknown };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Rate-limits per signed-in user (keyed by the stable Clerk user id `sub`), else
 * per client IP — so one user/IP can't exhaust everyone's quota, and each account
 * gets its OWN bucket regardless of device or token refresh. Behind a proxy,
 * `trust proxy` must be enabled (see main.ts) so req.ip is the real client.
 */
@Injectable()
export class UserOrIpThrottlerGuard extends ThrottlerGuard {
  /**
   * TEMPORARY kill-switch: set `DISABLE_RATE_LIMIT=1` in this backend's .env to
   * turn off all throttling (e.g. for a heavy automated test pass). Remove the
   * env var (or set it to anything else) and restart to re-enable rate limiting.
   */
  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return process.env.DISABLE_RATE_LIMIT === '1';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const auth = typeof req.headers?.authorization === 'string' ? req.headers.authorization : '';
    if (auth.startsWith('Bearer ')) {
      const sub = subFromJwt(auth.slice(7));
      if (sub) return `user:${sub}`;
    }
    const ip = Array.isArray(req.ips) && req.ips.length ? req.ips[0] : req.ip;
    return `ip:${ip}`;
  }
}
