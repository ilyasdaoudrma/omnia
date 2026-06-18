import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface OrderItemInput {
  menuItemId: string;
  qty: number;
}
export interface CreateOrderInput {
  vendorId: string;
  items: OrderItemInput[];
  source?: 'web' | 'agent';
}

export interface ItemSnapshot {
  name: string;
  price: number;
  qty: number;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Place a real order for the signed-in user. Used by the web app AND the agent. */
  async create(user: User, input: CreateOrderInput) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: input.vendorId }, include: { items: true } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const snapshot: ItemSnapshot[] = [];
    for (const line of input.items) {
      const item = vendor.items.find((i) => i.id === line.menuItemId);
      if (item && line.qty > 0) snapshot.push({ name: item.name, price: item.price, qty: Math.min(line.qty, 20) });
    }
    if (!snapshot.length) throw new BadRequestException('No valid items in order');

    const subtotal = snapshot.reduce((sum, i) => sum + i.price * i.qty, 0);
    const total = subtotal + vendor.deliveryFee;

    const order = await this.prisma.order.create({
      data: {
        userId: user.id,
        vendorId: vendor.id,
        items: snapshot as unknown as object,
        subtotal,
        deliveryFee: vendor.deliveryFee,
        total,
        status: 'preparing',
        source: input.source ?? 'web',
      },
      include: { vendor: true },
    });
    return shape(order);
  }

  async listMine(user: User) {
    if (!this.prisma.connected) return [];
    const orders = await this.prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { vendor: true },
    });
    return orders.map(shape);
  }

  /** Cancel one of the user's own orders, unless it's already on its way or delivered. */
  async cancel(user: User, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId: user.id },
      include: { vendor: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'cancelled') return shape(order);
    if (order.status === 'delivered' || order.status === 'delivering') {
      throw new BadRequestException('This order is already on its way and can no longer be cancelled');
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'cancelled' },
      include: { vendor: true },
    });
    return shape(updated);
  }
}

interface OrderWithVendor {
  id: string;
  vendorId: string;
  items: unknown;
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  status: string;
  source: string;
  createdAt: Date;
  vendor: { name: string; image: string | null };
}

function shape(o: OrderWithVendor) {
  return {
    id: o.id,
    vendorId: o.vendorId,
    vendorName: o.vendor.name,
    image: o.vendor.image,
    items: o.items as ItemSnapshot[],
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    currency: o.currency,
    status: o.status,
    source: o.source,
    createdAt: o.createdAt,
  };
}
