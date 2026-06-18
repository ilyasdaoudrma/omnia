import { Controller, Get, Param, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ListingsService } from './listings.service';

class ListingQueryDto {
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) guests?: number;
}

@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  search(@Query() q: ListingQueryDto) {
    return this.listings.search(q);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.listings.get(id);
  }
}
