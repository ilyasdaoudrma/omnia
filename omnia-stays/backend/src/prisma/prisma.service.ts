import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  /** True once a connection has been established; lets callers degrade gracefully. */
  public connected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.connected = true;
      this.logger.log('Connected to PostgreSQL');
    } catch (err) {
      // Persistence is best-effort: the agent stream must still work in a
      // keyless/db-less demo. We log loudly rather than crash the server.
      this.logger.error(`Database unavailable — persistence disabled. ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
