import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(city?: string) {
    if (!this.prisma.connected) return [];
    const where: Prisma.VendorWhereInput = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    return this.prisma.vendor.findMany({
      where,
      orderBy: { rating: 'desc' },
      include: { items: { orderBy: { price: 'asc' } } },
      take: 48,
    });
  }

  async get(id: string) {
    if (!this.prisma.connected) throw new NotFoundException();
    const vendor = await this.prisma.vendor.findUnique({ where: { id }, include: { items: { orderBy: { price: 'asc' } } } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }
}
