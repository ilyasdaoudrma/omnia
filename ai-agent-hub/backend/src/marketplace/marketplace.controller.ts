import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { StaysService } from './stays.service';
import { FoodService } from './food.service';
import { StaySearchDto, BookStayDto, FoodSearchDto, OrderDto } from './dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('market')
export class MarketplaceController {
  constructor(
    private readonly stays: StaysService,
    private readonly food: FoodService,
  ) {}

  // ── Stays (public browse) ──
  @Get('stays')
  searchStays(@Query() q: StaySearchDto) {
    return this.stays.search(q);
  }

  @Get('stays/:id')
  getStay(@Param('id') id: string) {
    return this.stays.get(id);
  }

  @Post('stays/:id/book')
  @UseGuards(AuthGuard)
  bookStay(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: BookStayDto) {
    return this.stays.book(user, id, dto.nights ?? 2, dto.guests);
  }

  // ── Eats (public browse) ──
  @Get('eats')
  searchFood(@Query() q: FoodSearchDto) {
    return this.food.search(q);
  }

  @Get('eats/:id')
  getVendor(@Param('id') id: string) {
    return this.food.getVendor(id);
  }

  @Post('eats/:id/order')
  @UseGuards(AuthGuard)
  order(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: OrderDto) {
    return this.food.order(user, id, dto.itemIds);
  }
}
