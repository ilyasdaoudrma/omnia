import { Injectable, NotFoundException } from '@nestjs/common';
import type { Review, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateReviewInput {
  rating: number;
  comment?: string;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Recent guest reviews for a listing (public). */
  async listForListing(listingId: string) {
    if (!this.prisma.connected) return [];
    const rows = await this.prisma.review.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map(shape);
  }

  /** Create a guest review (its own average is computed from the review rows). */
  async create(user: User, listingId: string, input: CreateReviewInput) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
    const authorName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Guest';
    const review = await this.prisma.review.create({
      data: { listingId, userId: user.id, rating, comment: input.comment?.slice(0, 600) || null, authorName },
    });
    return shape(review);
  }
}

function shape(r: Review) {
  return { id: r.id, authorName: r.authorName, rating: r.rating, comment: r.comment, createdAt: r.createdAt };
}
