import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ClerkIdentity {
  clerkId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Upsert a Clerk-authenticated identity into our users table. */
  async syncFromClerk(identity: ClerkIdentity) {
    if (!this.prisma.connected) return null;
    try {
      return await this.prisma.user.upsert({
        where: { clerkId: identity.clerkId },
        create: {
          clerkId: identity.clerkId,
          email: identity.email,
          firstName: identity.firstName,
          lastName: identity.lastName,
          imageUrl: identity.imageUrl,
        },
        update: {
          email: identity.email,
          firstName: identity.firstName,
          lastName: identity.lastName,
          imageUrl: identity.imageUrl,
        },
      });
    } catch (err) {
      this.logger.error(`User sync failed: ${(err as Error).message}`);
      return null;
    }
  }

  async findByClerkId(clerkId: string) {
    if (!this.prisma.connected) return null;
    return this.prisma.user.findUnique({ where: { clerkId } });
  }

  /**
   * Resolve (or lazily create) a user by clerkId WITHOUT a Clerk token. Used by
   * the trusted agent service path so the OMNIA scheduler can place recurring
   * orders on a user's behalf when they aren't present to supply a session.
   */
  async findOrCreateByClerkId(clerkId: string, email?: string) {
    if (!this.prisma.connected) return null;
    try {
      return await this.prisma.user.upsert({
        where: { clerkId },
        create: { clerkId, email },
        update: {},
      });
    } catch (err) {
      this.logger.error(`User resolve failed: ${(err as Error).message}`);
      return null;
    }
  }
}
