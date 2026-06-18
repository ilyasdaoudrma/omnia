import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import type { User } from '@prisma/client';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class OrderItemDto {
  @IsString() menuItemId!: string;
  @Type(() => Number) @IsInt() @Min(1) qty = 1;
}

class CreateOrderDto {
  @IsString() vendorId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
  @IsOptional() @IsIn(['web', 'agent']) source?: 'web' | 'agent';
}

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  @Get()
  listMine(@CurrentUser() user: User) {
    return this.orders.listMine(user);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.cancel(user, id);
  }
}
