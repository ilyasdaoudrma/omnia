import { Injectable, NotFoundException } from '@nestjs/common';
import type { User, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface FoodSearch {
  city?: string;
  maxPrice?: number;
}

@Injectable()
export class FoodService {
  constructor(private readonly prisma: PrismaService) {}

  /** Search owned food vendors. Falls back to top-rated if the city has none. */
  async search({ city }: FoodSearch, take = 12) {
    if (!this.prisma.connected) return [];
    const where: Prisma.FoodVendorWhereInput = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };

    let vendors = await this.prisma.foodVendor.findMany({
      where,
      orderBy: { rating: 'desc' },
      include: { items: { orderBy: { price: 'asc' } } },
      take,
    });
    if (vendors.length === 0) {
      vendors = await this.prisma.foodVendor.findMany({
        orderBy: { rating: 'desc' },
        include: { items: { orderBy: { price: 'asc' } } },
        take,
      });
    }
    return vendors;
  }

  async getVendor(id: string) {
    if (!this.prisma.connected) throw new NotFoundException();
    const vendor = await this.prisma.foodVendor.findUnique({ where: { id }, include: { items: true } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  /** Place a real order. Requires a signed-in user. */
  async order(user: User, vendorId: string, itemIds: string[]) {
    const vendor = await this.getVendor(vendorId);
    const items = vendor.items.filter((i) => itemIds.includes(i.id));
    const chosen = items.length ? items : vendor.items.slice(0, 1);
    const subtotal = chosen.reduce((sum, i) => sum + i.price, 0);
    const total = subtotal + vendor.deliveryFee;

    const booking = await this.prisma.booking.create({
      data: {
        userId: user.id,
        tool: 'restaurant',
        title: chosen.map((i) => i.name).join(', '),
        vendor: vendor.name,
        total,
        currency: 'MAD',
        status: 'pending',
        details: { vendorId, items: chosen.map((i) => ({ id: i.id, name: i.name, price: i.price })), deliveryFee: vendor.deliveryFee, etaMinutes: vendor.etaMinutes },
      },
    });
    await this.prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Order placed',
        body: `${vendor.name} — ${total} MAD, arriving in ~${vendor.etaMinutes} min.`,
        tone: 'accent',
      },
    });
    return booking;
  }
}
