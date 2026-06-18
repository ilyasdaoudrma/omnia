import { Module } from '@nestjs/common';
import { ToolsModule } from '../tools/tools.module';
import { RecurrencesService } from './recurrences.service';
import { RecurrencesController } from './recurrences.controller';
import { RecurrenceScheduler } from './recurrence.scheduler';
import { MarketplaceClient } from './marketplace.client';

@Module({
  imports: [ToolsModule],
  controllers: [RecurrencesController],
  providers: [RecurrencesService, RecurrenceScheduler, MarketplaceClient],
  exports: [RecurrencesService],
})
export class RecurrencesModule {}
