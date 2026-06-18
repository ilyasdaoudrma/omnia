import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { VendorsService } from './vendors.service';

class VendorQueryDto {
  @IsOptional() @IsString() city?: string;
}

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  search(@Query() q: VendorQueryDto) {
    return this.vendors.search(q.city);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.vendors.get(id);
  }
}
