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

  /** Recent reviews for a ride tier (public). */
  async listForRideClass(rideClassId: string) {
    if (!this.prisma.connected) return [];
    const rows = await this.prisma.review.findMany({
      where: { rideClassId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map(shape);
  }

  /** Create a review (its own average is computed from the review rows). */
  async create(user: User, rideClassId: string, input: CreateReviewInput) {
    const rideClass = await this.prisma.rideClass.findUnique({ where: { id: rideClassId } });
    if (!rideClass) throw new NotFoundException('Ride class not found');

    const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
    const authorName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Rider';
    const review = await this.prisma.review.create({
      data: { rideClassId, userId: user.id, rating, comment: input.comment?.slice(0, 600) || null, authorName },
    });
    return shape(review);
  }
}

function shape(r: Review) {
  return { id: r.id, authorName: r.authorName, rating: r.rating, comment: r.comment, createdAt: r.createdAt };
}
