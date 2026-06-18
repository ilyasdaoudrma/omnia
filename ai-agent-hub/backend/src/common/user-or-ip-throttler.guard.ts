import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { trackerKey } from './tracker-key';

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
   * turn off all throttling (e.g. for a heavy automated test pass). Set to 0 (or
   * remove it) and restart to re-enable rate limiting.
   */
  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return process.env.DISABLE_RATE_LIMIT === '1';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return trackerKey(req);
  }
}
