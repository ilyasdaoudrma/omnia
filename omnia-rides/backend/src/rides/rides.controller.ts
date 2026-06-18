import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { RidesService } from './rides.service';

class RideQueryDto {
  @IsOptional() @IsString() city?: string;
}

@Controller('rides')
export class RidesController {
  constructor(private readonly rides: RidesService) {}

  @Get()
  search(@Query() q: RideQueryDto) {
    return this.rides.search(q.city);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.rides.get(id);
  }
}
