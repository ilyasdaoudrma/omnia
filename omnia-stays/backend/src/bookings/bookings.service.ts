import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBookingInput {
  listingId: string;
  nights: number;
  guests: number;
  checkIn?: string;
  source?: 'web' | 'agent';
}

export interface ModifyBookingInput {
  nights?: number;
  guests?: number;
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a real booking for the signed-in user. Used by the web app AND the agent. */
  async create(user: User, input: CreateBookingInput) {
    const listing = await this.prisma.listing.findUnique({ where: { id: input.listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    const nights = Math.max(1, input.nights || 1);
    const total = listing.pricePerNight * nights;

    const booking = await this.prisma.booking.create({
      data: {
        userId: user.id,
        listingId: listing.id,
        nights,
        guests: Math.max(1, input.guests || 1),
        total,
        currency: listing.currency,
        status: 'confirmed',
        checkIn: input.checkIn ? new Date(input.checkIn) : null,
        source: input.source ?? 'web',
      },
      include: { listing: true },
    });
    return shape(booking);
  }

  async listMine(user: User) {
    if (!this.prisma.connected) return [];
    const bookings = await this.prisma.booking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { listing: true },
    });
    return bookings.map(shape);
  }

  /** Cancel one of the user's own bookings. Idempotent if already cancelled. */
  async cancel(user: User, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, userId: user.id },
      include: { listing: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'cancelled') return shape(booking);

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
      include: { listing: true },
    });
    return shape(updated);
  }

  /** Change a booking's nights and/or guests; recomputes the total. */
  async modify(user: User, id: string, input: ModifyBookingInput) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, userId: user.id },
      include: { listing: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'cancelled') throw new BadRequestException('Booking is cancelled');

    const nights = input.nights != null ? Math.max(1, Math.min(60, input.nights)) : booking.nights;
    const guests = input.guests != null ? Math.max(1, Math.min(20, input.guests)) : booking.guests;
    if (guests > booking.listing.maxGuests) {
      throw new BadRequestException(`This place sleeps up to ${booking.listing.maxGuests} guests`);
    }
    const total = booking.listing.pricePerNight * nights;

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { nights, guests, total },
      include: { listing: true },
    });
    return shape(updated);
  }
}

interface BookingWithListing {
  id: string;
  listingId: string;
  nights: number;
  guests: number;
  total: number;
  currency: string;
  status: string;
  checkIn: Date | null;
  source: string;
  createdAt: Date;
  listing: { title: string; city: string; images: string[] };
}

function shape(b: BookingWithListing) {
  return {
    id: b.id,
    listingId: b.listingId,
    title: b.listing.title,
    city: b.listing.city,
    image: b.listing.images[0],
    nights: b.nights,
    guests: b.guests,
    total: b.total,
    currency: b.currency,
    status: b.status,
    checkIn: b.checkIn,
    source: b.source,
    createdAt: b.createdAt,
  };
}
