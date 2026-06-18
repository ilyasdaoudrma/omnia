import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, RideClass } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SAMPLE_KM = 8;
const SAMPLE_MIN = 18;

/** Fare = flag-down + per-km + per-min. Shared by the storefront quote and bookings. */
export function quoteFare(
  rc: { baseFare: number; perKm: number; perMin: number },
  km = SAMPLE_KM,
  min = SAMPLE_MIN,
): number {
  return Math.round(rc.baseFare + rc.perKm * km + rc.perMin * min);
}

@Injectable()
export class RidesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(city?: string) {
    if (!this.prisma.connected) return [];
    const where: Prisma.RideClassWhereInput = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    const classes = await this.prisma.rideClass.findMany({ where, orderBy: { baseFare: 'asc' }, take: 48 });
    return classes.map(shape);
  }

  async get(id: string) {
    if (!this.prisma.connected) throw new NotFoundException();
    const rc = await this.prisma.rideClass.findUnique({ where: { id } });
    if (!rc) throw new NotFoundException('Ride class not found');
    return shape(rc);
  }
}

function shape(rc: RideClass) {
  return {
    id: rc.id,
    city: rc.city,
    name: rc.name,
    vehicle: rc.vehicle,
    baseFare: rc.baseFare,
    perKm: rc.perKm,
    perMin: rc.perMin,
    etaMinutes: rc.etaMinutes,
    seats: rc.seats,
    rating: rc.rating,
    image: rc.image,
    description: rc.description,
    estFare: quoteFare(rc),
    sampleKm: SAMPLE_KM,
    sampleMin: SAMPLE_MIN,
    currency: 'MAD',
  };
}
