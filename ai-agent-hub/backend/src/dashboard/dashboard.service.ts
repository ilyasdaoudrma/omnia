import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Aggregates the signed-in user's data for the dashboard surface. */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: User) {
    if (!this.prisma.connected) {
      return { trips: [], bookings: [], notifications: [], recentTasks: [] };
    }

    const [trips, bookings, notifications, recentTasks] = await Promise.all([
      this.prisma.itinerary.findMany({
        where: { userId: user.id },
        orderBy: { startDate: 'asc' },
        include: { _count: { select: { items: true } } },
        take: 6,
      }),
      this.prisma.booking.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.task.findMany({
        where: { conversation: { userId: user.id } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    return {
      trips,
      bookings,
      notifications,
      recentTasks,
      stats: {
        upcomingTrips: trips.length,
        openOrders: bookings.filter((b) => b.status !== 'cancelled').length,
        unread: notifications.filter((n) => !n.read).length,
      },
    };
  }
}
