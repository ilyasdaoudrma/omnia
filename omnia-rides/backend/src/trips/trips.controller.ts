import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import type { User } from '@prisma/client';
import { TripsService } from './trips.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class CreateTripDto {
  @IsString() rideClassId!: string;
  @IsOptional() @IsString() pickup?: string;
  @IsOptional() @IsString() dropoff?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(200) distanceKm?: number;
  @IsOptional() @IsIn(['web', 'agent']) source?: 'web' | 'agent';
}

class UpdateTripDto {
  @IsOptional() @IsString() pickup?: string;
  @IsOptional() @IsString() dropoff?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(200) distanceKm?: number;
}

@Controller('trips')
@UseGuards(AuthGuard)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTripDto) {
    return this.trips.create(user, dto);
  }

  @Get()
  listMine(@CurrentUser() user: User) {
    return this.trips.listMine(user);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.trips.cancel(user, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update(user, id, dto);
  }
}
