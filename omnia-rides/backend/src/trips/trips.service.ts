import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { User, Ride, RideClass } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { quoteFare } from '../rides/rides.service';

export interface CreateTripInput {
  rideClassId: string;
  pickup?: string;
  dropoff?: string;
  distanceKm?: number;
  source?: 'web' | 'agent';
}

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Book a ride for the signed-in user. Used by the web app AND the agent. */
  async create(user: User, input: CreateTripInput) {
    const rc = await this.prisma.rideClass.findUnique({ where: { id: input.rideClassId } });
    if (!rc) throw new NotFoundException('Ride class not found');

    const distanceKm = clampKm(input.distanceKm ?? 8);
    const minutes = Math.max(5, Math.round(distanceKm * 2.2));
    const fare = quoteFare(rc, distanceKm, minutes);

    const ride = await this.prisma.ride.create({
      data: {
        userId: user.id,
        rideClassId: rc.id,
        pickup: (input.pickup ?? '').slice(0, 160) || 'Current location',
        dropoff: (input.dropoff ?? '').slice(0, 160) || `${rc.city} centre`,
        distanceKm,
        minutes,
        fare,
        currency: 'MAD',
        status: 'confirmed',
        source: input.source ?? 'web',
      },
      include: { rideClass: true },
    });
    return shape(ride);
  }

  async listMine(user: User) {
    if (!this.prisma.connected) return [];
    const rides = await this.prisma.ride.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { rideClass: true },
    });
    return rides.map(shape);
  }

  /** Change a ride's pickup/dropoff (and re-quote if the distance changed). */
  async update(user: User, id: string, input: { pickup?: string; dropoff?: string; distanceKm?: number }) {
    const ride = await this.prisma.ride.findFirst({ where: { id, userId: user.id }, include: { rideClass: true } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status === 'cancelled') throw new BadRequestException('This ride is cancelled');
    if (ride.status === 'completed') throw new BadRequestException('This ride is already completed');

    const distanceKm = input.distanceKm != null ? clampKm(input.distanceKm) : ride.distanceKm;
    const minutes = Math.max(5, Math.round(distanceKm * 2.2));
    const fare = input.distanceKm != null ? quoteFare(ride.rideClass, distanceKm, minutes) : ride.fare;

    const updated = await this.prisma.ride.update({
      where: { id: ride.id },
      data: {
        pickup: input.pickup != null ? input.pickup.slice(0, 160) || ride.pickup : ride.pickup,
        dropoff: input.dropoff != null ? input.dropoff.slice(0, 160) || ride.dropoff : ride.dropoff,
        distanceKm,
        minutes,
        fare,
      },
      include: { rideClass: true },
    });
    return shape(updated);
  }

  /** Cancel one of the user's own rides, unless it's already completed. */
  async cancel(user: User, id: string) {
    const ride = await this.prisma.ride.findFirst({ where: { id, userId: user.id }, include: { rideClass: true } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status === 'cancelled') return shape(ride);
    if (ride.status === 'completed') throw new BadRequestException('This ride is already completed');

    const updated = await this.prisma.ride.update({
      where: { id: ride.id },
      data: { status: 'cancelled' },
      include: { rideClass: true },
    });
    return shape(updated);
  }
}

function shape(r: Ride & { rideClass: RideClass }) {
  return {
    id: r.id,
    rideClassId: r.rideClassId,
    className: r.rideClass.name,
    vehicle: r.rideClass.vehicle,
    image: r.rideClass.image,
    pickup: r.pickup,
    dropoff: r.dropoff,
    distanceKm: r.distanceKm,
    minutes: r.minutes,
    fare: r.fare,
    currency: r.currency,
    status: r.status,
    source: r.source,
    createdAt: r.createdAt,
  };
}

function clampKm(k: number): number {
  return Math.max(1, Math.min(200, Math.round((k || 8) * 10) / 10));
}
