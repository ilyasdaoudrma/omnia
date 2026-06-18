import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ListingSearch {
  city?: string;
  maxPrice?: number;
  guests?: number;
}

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async search({ city, maxPrice, guests }: ListingSearch) {
    if (!this.prisma.connected) return [];
    const where: Prisma.ListingWhereInput = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (maxPrice) where.pricePerNight = { lte: maxPrice };
    if (guests) where.maxGuests = { gte: guests };
    return this.prisma.listing.findMany({ where, orderBy: [{ rating: 'desc' }, { pricePerNight: 'asc' }], take: 48 });
  }

  async get(id: string) {
    if (!this.prisma.connected) throw new NotFoundException();
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }
}
