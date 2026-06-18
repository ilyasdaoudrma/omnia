import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurrencesService } from './recurrences.service';

/**
 * Fires due recurring agent tasks once a minute. Kept separate from the service
 * so the firing logic stays decoupled from the scheduling mechanism (and easy to
 * trigger manually via the admin endpoint in tests).
 */
@Injectable()
export class RecurrenceScheduler {
  private readonly logger = new Logger(RecurrenceScheduler.name);
  private running = false;

  constructor(private readonly recurrences: RecurrencesService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) return; // never overlap a slow sweep with the next tick
    this.running = true;
    try {
      await this.recurrences.runDue();
    } catch (err) {
      this.logger.error(`Recurrence sweep failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
