import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max, IsIn } from 'class-validator';
import type { User } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class CreateBookingDto {
  @IsString() listingId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(60) nights = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(20) guests = 1;
  @IsOptional() @IsString() checkIn?: string;
  @IsOptional() @IsIn(['web', 'agent']) source?: 'web' | 'agent';
}

class ModifyBookingDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) nights?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) guests?: number;
}

@Controller('bookings')
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user, dto);
  }

  @Get()
  listMine(@CurrentUser() user: User) {
    return this.bookings.listMine(user);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.bookings.cancel(user, id);
  }

  @Patch(':id')
  modify(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: ModifyBookingDto) {
    return this.bookings.modify(user, id, dto);
  }
}
