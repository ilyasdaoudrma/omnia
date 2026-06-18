import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import type { ClerkIdentity } from '../users/users.service';

/**
 * Verifies Clerk session JWTs. Google (and email) sign-in are configured as
 * social connections in the Clerk dashboard — verification here is identical
 * regardless of which method the user logged in with.
 */
@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly secretKey?: string;

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('CLERK_SECRET_KEY') || undefined;
  }

  get enabled() {
    return Boolean(this.secretKey);
  }

  /** Returns the verified identity, or null if the token is missing/invalid. */
  async verify(token?: string): Promise<ClerkIdentity | null> {
    if (!token || !this.secretKey) return null;
    try {
      const claims = await verifyToken(token, { secretKey: this.secretKey });
      return {
        clerkId: claims.sub,
        email: (claims as Record<string, unknown>).email as string | undefined,
        firstName: (claims as Record<string, unknown>).first_name as string | undefined,
        lastName: (claims as Record<string, unknown>).last_name as string | undefined,
        imageUrl: (claims as Record<string, unknown>).image_url as string | undefined,
      };
    } catch (err) {
      this.logger.warn(`Token verification failed: ${(err as Error).message}`);
      return null;
    }
  }
}
