import { Injectable, NotFoundException } from '@nestjs/common';
import type { User, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface StaySearch {
  city?: string;
  maxPrice?: number;
  guests?: number;
}

@Injectable()
export class StaysService {
  constructor(private readonly prisma: PrismaService) {}

  /** Search owned stay inventory. Falls back to top-rated if the city has none. */
  async search({ city, maxPrice, guests }: StaySearch, take = 12) {
    if (!this.prisma.connected) return [];
    const where: Prisma.StayListingWhereInput = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (maxPrice) where.pricePerNight = { lte: maxPrice };
    if (guests) where.maxGuests = { gte: guests };

    let results = await this.prisma.stayListing.findMany({
      where,
      orderBy: [{ rating: 'desc' }, { pricePerNight: 'asc' }],
      take,
    });

    // Never return empty just because the city isn't in our catalog yet.
    if (results.length === 0) {
      const fallback: Prisma.StayListingWhereInput = {};
      if (maxPrice) fallback.pricePerNight = { lte: maxPrice };
      if (guests) fallback.maxGuests = { gte: guests };
      results = await this.prisma.stayListing.findMany({ where: fallback, orderBy: { rating: 'desc' }, take });
    }
    return results;
  }

  async get(id: string) {
    if (!this.prisma.connected) throw new NotFoundException();
    const listing = await this.prisma.stayListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  /** Create a real booking for a stay. Requires a signed-in user. */
  async book(user: User, listingId: string, nights = 2, guests?: number) {
    const listing = await this.get(listingId);
    const total = listing.pricePerNight * Math.max(1, nights);
    const booking = await this.prisma.booking.create({
      data: {
        userId: user.id,
        tool: 'travel',
        title: listing.title,
        vendor: 'OMNIA Stays',
        total,
        currency: listing.currency,
        status: 'confirmed',
        details: { listingId, nights, guests: guests ?? listing.maxGuests, pricePerNight: listing.pricePerNight },
      },
    });
    await this.prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Stay booked',
        body: `${listing.title} confirmed for ${nights} night(s) — ${total} ${listing.currency}.`,
        tone: 'success',
      },
    });
    return booking;
  }
}
