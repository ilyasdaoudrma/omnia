import { Module } from '@nestjs/common';
import { StaysService } from './stays.service';
import { FoodService } from './food.service';
import { MarketplaceController } from './marketplace.controller';

@Module({
  controllers: [MarketplaceController],
  providers: [StaysService, FoodService],
  exports: [StaysService, FoodService],
})
export class MarketplaceModule {}
